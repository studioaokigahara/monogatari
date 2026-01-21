import { Chat } from "@/database/schema/chat";
import {
    Simulation,
    SimulationNodeDatum,
    forceCenter,
    forceCollide,
    forceLink,
    forceManyBody,
    forceSimulation
} from "d3-force";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Background,
    Node,
    Panel,
    ReactFlow,
    ReactFlowProvider,
    // addEdge,
    useEdgesState,
    useNodesInitialized,
    useNodesState,
    useReactFlow
} from "reactflow";
import "reactflow/dist/style.css";

function Graph({ chat }: { chat: Chat }) {
    const [initialNodes, initialEdges] = useMemo(() => {
        const initialNodes = chat.vertices.map((vertex) => ({
            id: vertex.id,
            position: {
                x: Math.random() * 400 - 200,
                y: Math.random() * 400 - 200
            },
            data: { label: `${vertex.message?.role}\n\n${vertex.message?.id}` }
        }));
        const initialEdges = chat.vertices.map((vertex) => ({
            id: `${vertex.parent ?? ""}-${vertex.id}`,
            source: vertex.parent ?? "",
            target: vertex.id,
            animated: true
        }));
        return [initialNodes, initialEdges];
    }, [chat]);

    const [nodes, , onNodesChange] = useNodesState(initialNodes);
    const [edges, , onEdgesChange] = useEdgesState(initialEdges);

    const { getNodes, getEdges, setNodes, fitView } = useReactFlow();
    const initialized = useNodesInitialized();

    const [charge, setCharge] = useState(-300);
    const [linkDistance, setLinkDistance] = useState(180);
    const [centerStrength, setCenterStrength] = useState(0.1);
    const [collideRadius, setCollideRadius] = useState(70);

    const simRef = useRef<Simulation<any, any> | null>(null);
    const rafRef = useRef<number | null>(null);
    const nodeRef = useRef<Node | null>(null);

    const nodeMapRef = useRef<Map<string, SimulationNodeDatum>>(new Map());
    const nodeIndexRef = useRef<Map<string, number>>(new Map());

    useEffect(() => {
        nodeIndexRef.current.clear();
        nodes.forEach((node, index) => nodeIndexRef.current.set(node.id, index));
    }, [nodes]);

    const render = useCallback(
        (simNodes: SimulationNodeDatum[]) => {
            if (rafRef.current !== null) return;

            rafRef.current = requestAnimationFrame(() => {
                rafRef.current = null;

                setNodes((nodes) => {
                    const next = [...nodes];
                    for (const simNode of simNodes) {
                        const index = nodeIndexRef.current.get(simNode.id);
                        if (!index) continue;
                        const node = next[index];
                        next[index] = {
                            ...node,
                            position: {
                                x: simNode.x ?? node.position.x,
                                y: simNode.y ?? node.position.y
                            }
                        };
                    }
                    return next;
                });
            });
        },
        [setNodes]
    );

    const dragHandlers = useMemo(
        () => ({
            start: (_event: React.MouseEvent, node: Node) => {
                const simulation = simRef.current;
                if (!simulation) return;

                if (simulation.alpha() <= simulation.alphaMin()) {
                    simulation.alpha(0.3).restart();
                }

                nodeRef.current = node;

                const simNode = nodeMapRef.current.get(node.id);
                if (simNode) {
                    simNode.fx = node.position.x;
                    simNode.fy = node.position.y;
                }
            },
            drag: (_event: React.MouseEvent, node: Node) => {
                nodeRef.current = node;
                const simNode = nodeMapRef.current.get(node.id);
                if (simNode) {
                    simNode.fx = node.position.x;
                    simNode.fy = node.position.y;
                }
            },
            stop: () => {
                if (!nodeRef.current) return;
                const id = nodeRef.current.id;
                nodeRef.current = null;
                const simNode = nodeMapRef.current.get(id);
                if (simNode) {
                    simNode.fx = null;
                    simNode.fy = null;
                }
            }
        }),
        []
    );

    useEffect(() => {
        if (!initialized) return;

        simRef.current?.stop();
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        nodeMapRef.current.clear();

        const simNodes: SimulationNodeDatum[] = getNodes().map((node) => {
            const simNode = {
                id: node.id,
                x: node.position.x,
                y: node.position.y
            };
            nodeMapRef.current.set(node.id, simNode);
            return simNode;
        });

        const simulation = forceSimulation(simNodes)
            .force("charge", forceManyBody().strength(charge))
            .force(
                "link",
                forceLink(getEdges())
                    .id((node) => node.id)
                    .distance(linkDistance)
            )
            .force("center", forceCenter(0, 0).strength(centerStrength))
            .force("collide", forceCollide(collideRadius));

        // on every tick, push new coords into RF
        simulation.on("tick", () => render(simulation.nodes()));

        simRef.current = simulation;

        const fitTimeout = setTimeout(() => {
            fitView({ padding: 0.2, duration: 300 });
        }, 500);

        return () => {
            simulation.stop();
            clearTimeout(fitTimeout);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, [
        initialized,
        charge,
        linkDistance,
        centerStrength,
        collideRadius,
        getNodes,
        getEdges,
        setNodes,
        fitView,
        render
    ]);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStart={dragHandlers.start}
            onNodeDrag={dragHandlers.drag}
            onNodeDragStop={dragHandlers.stop}
            fitView
        >
            <Panel position="top-left">
                <div className="flex flex-col gap-4">
                    <label>
                        Charge: {charge}
                        <input
                            type="range"
                            min={-1000}
                            max={0}
                            step={10}
                            value={charge}
                            onChange={(e) => setCharge(+e.target.value)}
                        />
                    </label>
                    <label>
                        Link Distance: {linkDistance}
                        <input
                            type="range"
                            min={20}
                            max={300}
                            step={10}
                            value={linkDistance}
                            onChange={(e) => setLinkDistance(+e.target.value)}
                        />
                    </label>
                    <label>
                        Center Strength: {centerStrength.toFixed(2)}
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={centerStrength}
                            onChange={(e) => setCenterStrength(+e.target.value)}
                        />
                    </label>
                    <label>
                        Collide Radius: {collideRadius}
                        <input
                            type="range"
                            min={1}
                            max={100}
                            step={1}
                            value={collideRadius}
                            onChange={(e) => setCollideRadius(+e.target.value)}
                        />
                    </label>
                </div>
            </Panel>
            <Background />
        </ReactFlow>
    );
}

export function GraphRenderer({ chat }: { chat: Chat }) {
    return (
        <ReactFlowProvider>
            <Graph chat={chat} />
        </ReactFlowProvider>
    );
}

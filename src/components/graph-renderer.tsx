import {
    Simulation,
    SimulationNodeDatum,
    forceCenter,
    forceCollide,
    forceLink,
    forceManyBody,
    forceSimulation,
} from "d3-force";
import {
    MouseEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
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
    useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { ConversationGraph } from "@/types/conversation-graph";

function Graph({ graph }: { graph: ConversationGraph }) {
    const graphObj = graph.save();
    const initialNodes = graphObj.vertices.map((v) => ({
        id: v.id,
        position: {
            x: Math.random() * 400 - 200,
            y: Math.random() * 400 - 200,
        },
        data: { label: v.messages.map((m) => `${m.role}\n\n${m.id}`) },
    }));
    const initialEdges = graphObj.vertices.flatMap((v) =>
        v.parents.map((p) => ({
            id: `${p}-${v.id}`,
            source: p,
            target: v.id,
            animated: true,
        })),
    );

    const [nodes, , onNodesChange] = useNodesState(initialNodes);
    const [edges, , onEdgesChange] = useEdgesState(initialEdges);

    const { getNodes, getEdges, setNodes, fitView } = useReactFlow();
    const initialized = useNodesInitialized();

    const [charge, setCharge] = useState(-300);
    const [linkDistance, setLinkDistance] = useState(180);
    const [centerStrength, setCenterStrength] = useState(0.1);
    const [collideRadius, setCollideRadius] = useState(50);

    const simRef = useRef<Simulation<any, any> | null>(null);
    const rafRef = useRef<number | null>(null);

    const nodeRef = useRef<Node | null>(null);
    const dragHandlers = useMemo(
        () => ({
            start: (_event: MouseEvent, node: Node) => {
                const simulation = simRef.current!;
                if (simulation.alpha() <= simulation.alphaMin()) {
                    simulation.alpha(0.5).restart();
                    animate();
                }
                nodeRef.current = node;
            },
            drag: (_event: MouseEvent, node: Node) => (nodeRef.current = node),
            stop: () => (nodeRef.current = null),
        }),
        [],
    );

    const animate = useCallback(() => {
        const simulation = simRef.current!;
        const activeNode = nodeRef.current;
        if (activeNode && simRef.current) {
            const simNode = simRef.current
                .nodes()
                .find((d) => d.id === activeNode.id);
            if (simNode) {
                simNode.fx = activeNode.position.x;
                simNode.fy = activeNode.position.y;
            }
        }

        simulation.tick();
        if (simulation.alpha() > simulation.alphaMin()) {
            rafRef.current = requestAnimationFrame(() => {
                fitView();
                animate();
            });
        }
    }, [fitView]);

    useEffect(() => {
        if (!initialized) return;

        simRef.current?.stop();
        rafRef.current && cancelAnimationFrame(rafRef.current);

        const simulation = forceSimulation(getNodes() as SimulationNodeDatum[])
            .force("charge", forceManyBody().strength(charge))
            .force(
                "link",
                forceLink(getEdges())
                    .id((d) => d.id)
                    .distance(linkDistance),
            )
            .force("center", forceCenter(0, 0).strength(centerStrength))
            .force("collide", forceCollide(collideRadius));

        simRef.current = simulation;

        // on every tick, push new coords into RF
        simulation.on("tick", () => {
            const updated = simulation.nodes().map((d: any) => ({
                id: d.id,
                position: { x: d.x, y: d.y },
            }));
            setNodes((nds) =>
                nds.map((n) => {
                    const upd = updated.find((u) => u.id === n.id);
                    return upd ? { ...n, position: upd.position } : n;
                }),
            );
        });

        animate();

        return () => {
            simulation.stop();
            rafRef.current && cancelAnimationFrame(rafRef.current);
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

export function GraphRenderer({ graph }: { graph: ConversationGraph }) {
    return (
        <ReactFlowProvider>
            <Graph graph={graph} />
        </ReactFlowProvider>
    );
}

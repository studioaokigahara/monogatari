const BASE_URL = "https://api.allorigins.win/raw?url=https://partyintheanchorhold.neocities.org"

export interface AnchorholdConfig {
    total_pages: number;
    total_bots: number;
    last_update: string;
}

export interface AnchorholdPost {
    id: string;
    content: string;
    imageURL?: string;
    board?: string;
    postID?: string;
    postURL?: string;
    timestamp?: string;
    links: {
        href: string;
        text: string;
    }[]
}

function breakText(element: Element): string {
    const parts: string[] = [];
    const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            parts.push(node.nodeValue ?? "")
        } else if ((node as Element).tagName === "BR") {
            parts.push("\n\n")
        } else {
            node.childNodes.forEach(walk)
        }
    }
    element.childNodes.forEach(walk)
    return parts.join("").replace(/\n{3,}/g, "\n\n");
}

function parseAnchorholdPosts(html: string, page: number): AnchorholdPost[] {
    const parser = new DOMParser();
    const document = parser.parseFromString(html, "text/html")
    const posts = Array.from(document.querySelectorAll(".post")).map((postElement, index) => {
        const contentElement = postElement.querySelector(".post-content")
        const imageElement = postElement.querySelector(".post-image img")

        const contentClone = contentElement?.cloneNode(true) as HTMLDivElement | undefined

        let board: string | undefined;
        let postID: string | undefined;
        let postURL: string | undefined;
        let timestamp: string | undefined;

        const h2 = contentClone?.querySelector("h2")
        if (h2) {
            const link = h2.querySelector("a")
            postID = link?.textContent?.trim() ?? ""
            postURL = link?.getAttribute("href") ?? ""

            board = (h2.childNodes[0]?.textContent || "").trim()

            const h2Text = h2.textContent || "";
            const match = h2Text.match(
                /\b(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\b/
            );
            if (match) timestamp = match[1];
        }

        h2?.remove()

        const links = []
        if (contentClone) {
            for (const a of Array.from(contentClone.querySelectorAll("a"))) {
                links.push({
                    href: a.getAttribute("href") || "",
                    text: a.textContent || ""
                })
            }
        }

        const content = contentClone ? breakText(contentClone).trim() : ""

        let id = `page${page}-index${index}`
        if (postID) id = postID

        return {
            id,
            imageURL: imageElement?.getAttribute("src") ?? undefined,
            content,
            board,
            postID,
            postURL,
            timestamp,
            links
        }
    })

    return posts
}

export async function fetchAnchorholdConfig(): Promise<AnchorholdConfig> {
    const response = await fetch(`${BASE_URL}/config.json`)

    if (!response.ok) {
        throw new Error(`Failed to fetch Anchorhold config.json: ${response.status} ${response.statusText}`)
    }

    const config: AnchorholdConfig = await response.json()

    if (typeof config.total_pages !== "number" || typeof config.total_bots !== "number" || typeof config.last_update !== "string") {
        throw new Error("Malformed Anchorhold config.json")
    }

    return config
}

export async function fetchAnchorholdPage(page: number): Promise<AnchorholdPost[]> {
    const response = await fetch(`${BASE_URL}/feed/page_${page}`)

    if (!response.ok) {
        throw new Error(`Failed to fetch page ${page} of Anchorhold feed: ${response.status} ${response.statusText}`)
    }

    const html = await response.text()
    return parseAnchorholdPosts(html, page)
}

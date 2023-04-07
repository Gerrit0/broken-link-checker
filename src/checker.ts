import { Parser } from "htmlparser2";
import fetch from "node-fetch";

export interface FetchResult {
    url: URL;
    exists: boolean;
    ids: Set<string>;
    linksInPage: URL[];
}

export interface CheckerOptions {
    shouldRecurse(url: URL): boolean;
}

export class Checker {
    private pageCache = new Map<string, FetchResult>();

    async *run(
        root: URL,
        options: CheckerOptions
    ): AsyncGenerator<FetchResult> {
        const seen = new Set<string>();
        const queue = [root];

        while (queue.length) {
            const url = queue.shift()!;
            const withoutHash = new URL(url);
            withoutHash.hash = "";

            if (seen.has(withoutHash.href)) continue;
            seen.add(withoutHash.href);

            const result = await this.fetch(url);

            for (const child of result.linksInPage) {
                if (options.shouldRecurse(child)) {
                    queue.push(child);
                }
            }

            yield result;
        }
    }

    async fetch(url: URL): Promise<FetchResult> {
        const noHash = new URL(url);
        noHash.hash = "";

        return this.pageCache.get(noHash.href) ?? this.forceFetch(url);
    }

    async forceFetch(url: URL): Promise<FetchResult> {
        const noHash = new URL(url);
        noHash.hash = "";

        const result: FetchResult = {
            url: noHash,
            exists: false,
            ids: new Set(),
            linksInPage: [],
        };

        try {
            const response = await fetch(url);
            result.exists = response.status === 200;
            if (result.exists) {
                const text = await response.text();

                const parser = new Parser({
                    onopentag(name, attribs) {
                        if (attribs.id) {
                            result.ids.add(attribs.id);
                        }
                        if (attribs.name) {
                            result.ids.add(attribs.name);
                        }

                        switch (name.toUpperCase()) {
                            case "A":
                                if (attribs.href) {
                                    result.linksInPage.push(
                                        new URL(attribs.href, response.url)
                                    );
                                }
                        }
                    },
                });
                parser.parseComplete(text);
            }
        } catch {
            // ignore
        }

        this.pageCache.set(noHash.href, result);
        return result;
    }
}

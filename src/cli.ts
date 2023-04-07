import cmdTs from "./cmd-ts.cjs";
const {
    multioption,
    boolean,
    command,
    flag,
    positional,
    run,
    HttpUrl,
    array,
    string,
} = cmdTs;

import packageInfo from "./info.cjs";
import { Checker, CheckerOptions } from "./checker.js";

interface Options {
    recursive: boolean;
    internal: boolean;
    external: boolean;
    excludePatterns: string[];
}

async function report(root: URL, options: Options) {
    const checker = new Checker();

    const patterns = options.excludePatterns.map((pat) => new RegExp(pat));
    function shouldRecurse(url: URL) {
        if (!options.recursive) return false;
        if (url.hostname !== root.hostname) return false;

        return patterns.every((pat) => !pat.test(url.href));
    }

    for await (const page of checker.run(root, {
        shouldRecurse,
    })) {
        if (!page.exists) {
            console.error(`${page.url} does not exist`);
            continue;
        }

        for (const link of page.linksInPage) {
            if (link.hostname === root.hostname) {
                if (!options.internal) continue;
            } else {
                if (!options.external) continue;
            }

            const child = await checker.fetch(link);
            if (!child.exists) {
                console.error(
                    `${page.url} links to ${link.href}, which does not exist`
                );
                continue;
            }
            if (link.hash) {
                if (!child.ids.has(link.hash.substring(1))) {
                    const noHash = new URL(link);
                    noHash.hash = "";

                    console.error(
                        `${page.url} links to hash ${link.hash} within ${noHash.href}, which does not exist`
                    );
                    continue;
                }
            }
        }
    }
}

const cmd = command({
    name: "blc",
    description: packageInfo.description,
    version: packageInfo.version,
    args: {
        recursive: flag({ short: "r", long: "recursive", type: boolean }),
        internal: flag({ short: "i", long: "internal", type: boolean }),
        external: flag({ short: "e", long: "external", type: boolean }),
        exclude: multioption({
            short: "x",
            long: "exclude",
            type: array(string),
        }),
        url: positional({ type: HttpUrl }),
    },
    handler: async (args) => {
        await report(args.url, {
            excludePatterns: args.exclude,
            external: args.external,
            internal: args.internal,
            recursive: args.recursive,
        });
    },
});

run(cmd, process.argv.slice(2)).catch((error) => {
    console.error(error);
    process.exit(1);
});

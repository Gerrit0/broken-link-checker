#!/usr/bin/env node
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

    let pages = 0;
    let goodLinks = 0;
    let badLinks = 0;
    let ignoredLinks = 0;
    for await (const page of checker.run(root, {
        shouldRecurse,
    })) {
        pages++;
        if (!page.exists) {
            console.error(`${page.url} does not exist`);
            badLinks++;
            continue;
        }

        for (const link of page.linksInPage) {
            if (link.hostname === root.hostname) {
                if (!options.internal) {
                    ignoredLinks++;
                    continue;
                }
            } else {
                if (!options.external) {
                    ignoredLinks++;
                    continue;
                }
            }

            const child = await checker.fetch(link);
            if (!child.exists) {
                console.error(
                    `${page.url} links to ${link.href}, which does not exist`
                );
                badLinks++;
                continue;
            } else if (link.hash) {
                if (!child.ids.has(link.hash.substring(1))) {
                    const noHash = new URL(link);
                    noHash.hash = "";

                    console.error(
                        `${page.url} links to hash ${link.hash} within ${noHash.href}, which does not exist`
                    );
                    badLinks++;
                    continue;
                } else {
                    goodLinks++;
                }
            }
        }
    }

    console.log(
        `Checked ${pages} pages for broken links, found ${goodLinks} working links, ${badLinks} broken links, ignored ${ignoredLinks} links`
    );
    process.exit(badLinks);
}

const cmd = command({
    name: "blc",
    description: packageInfo.description,
    version: packageInfo.version,
    args: {
        recursive: flag({
            short: "r",
            long: "recursive",
            type: boolean,
            description: "Also check pages linked to by the original page.",
        }),
        internal: flag({
            short: "i",
            long: "internal",
            type: boolean,
            description: "Check internal links.",
        }),
        external: flag({
            short: "e",
            long: "external",
            type: boolean,
            description: "Check external links.",
        }),
        exclude: multioption({
            short: "x",
            long: "exclude",
            type: array(string),
            description:
                "RegEx URL patterns to not recurse to when checking pages.",
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

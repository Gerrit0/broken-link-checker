# @gerrit0/broken-link-checker

Checks for broken links on a site. Currently very limited to meet a specific need.

```bash
npm install --global @gerrit0/broken-link-checker
blc http://localhost:8080 -i
```

## Help

```
blc 0.0.1
> Check for broken links on a site.

FLAGS:
  --recursive, -r - Also check pages linked to by the original page.
  --internal, -i  - Check internal links.
  --external, -e  - Check external links.
  --help, -h      - show help
  --version, -v   - print the version

OPTIONS:
  --exclude <str>, -x=<str> - RegEx URL patterns to not recurse to when checking pages.

ARGUMENTS:
  <url> - A valid URL
```

Note that if you do not specify at least one of `-i` or `-e`, no links will be checked.

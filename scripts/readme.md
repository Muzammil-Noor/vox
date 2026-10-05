# Scripts

Everything here builds, tests or packages Vox. All of them can be run from the repository root and work out their own paths, so there is no directory to be in first.

| Script                    | What it does                                                |
| ------------------------- | ----------------------------------------------------------- |
| `build.sh` / `build.bat`  | Generate the parser, compile the Java engine, write `build/vox.jar` |
| `test.sh`                 | Run every program in `programs/` against one engine          |
| `parity.sh`               | Run both engines over everything and require identical output |
| `package.sh` / `package.bat` | Build the standalone `dist/vox/`, a zipand the installer |
| `report.mjs`              | Turn test verdicts into the JSON the website's tests page reads |
| `check-walkthrough.mjs`   | Confirm the website's "add a feature" page still shows real code |
| `vox.bat`                 | Launcher for a source checkout, so `vox file.vox` works       |
| `installer/`              | The Inno Setup script and icon for the Windows installer      |
| `tools/`                  | The ANTLR jar, the one build dependency that is committed     |

## The usual two

```bash
./scripts/build.sh     # then: java -jar build/vox.jar programs/examples/factorial.vox
./scripts/test.sh      # 151 programs, both what they print and what they reject
```

`test.sh` drives whichever engine you point it at:

```bash
./scripts/test.sh                                                   # Java
VOX_CMD="node engines/typescript/dist/cli.js" ./scripts/test.sh     # TypeScript
VOX_CMD="dist/vox/vox.exe" ./scripts/test.sh                        # the packaged build
```

Set `VOX_REPORT=file.tsv` and it also writes a verdict per program, which is
what CI feeds to `report.mjs` to publish the Java results to the website.

Those results are force-pushed to the `test-results` branch as `latest.json`,
and the tests page fetches them from there. The branch holds no site, so it
also carries a `vercel.json` turning deployment off, which stops Vercel trying
to build a preview of it on every run.

## Where the output goes

Both are ignored by git:

- `build/` holds the generated parser, the compiled classes and the jar.
- `dist/` holds the packaged application, the zip and the installer.

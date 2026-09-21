import Nav from "../components/Nav";
import Code from "../components/Code";

const TESTCode = `
Contents of the selected test
`;

const run_tests = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
const fail_tests = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]

export default function Tests() {
  return (
    <div className="neon-backdrop min-h-full">
      <Nav />

      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="mt-3 text-3xl font-bold text-paper">
            Vox Test Suite
        </h2>
        <p className="mt-3 text-fog">
            Vox has many tests, both engines must pass all tests for a feature to be ready. There are two types of tests, run and fail. Run tests are programs that must run and produce the expected output and fail tests must fail to produce an expected error. A Fail test running as a succesful program is a huge red flag.
        </p>
        <div className="w-full flex mt-3 md:mt-6">
            <div className=" flex-1">
                <h2 className="mt-3 text-xl font-bold text-paper">
                    Run Tests
                </h2>
                <div className="px-4 flex flex-wrap gap-2">
                    {run_tests.map((test) => {
                        return(
                            <div className={`transition-all duration-200 cursor-pointer rounded-md size-6 ${Math.random() < 0.8 ? "bg-green-500 hover:bg-green-700" : "bg-red-400 hover:bg-red-700"}`}>
                                
                            </div>
                        )
                    })}
                </div>
                <h2 className="mt-3 text-xl font-bold text-paper">
                    Fail Tests
                </h2>
                <div className="px-4 flex flex-wrap gap-2">
                    {fail_tests.map((test) => {
                        return(
                            <div className={`transition-all duration-200 cursor-pointer rounded-md size-6 ${Math.random() < 0.8 ? "bg-green-500 hover:bg-green-700" : "bg-red-400 hover:bg-red-700"}`}>
                                
                            </div>
                        )
                    })}
                </div>
            </div>
            <div className="flex-1 flex flex-col gap-2">
                <Code source={TESTCode} title="Test" accent="red"/>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <div className="overflow-hidden rounded-lg border border-line-2 bg-panel">
                        <div className="flex h-9 items-center border-b border-line px-4">
                            <span className="panel-title">Expected</span>
                        </div>
                        <pre className="px-4 py-4 font-mono text-[13px] leading-relaxed text-fog">
                            <code>Code Expected Output</code>
                        </pre>
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="overflow-hidden rounded-lg border border-line-2 bg-panel">
                        <div className="flex h-9 items-center border-b border-line px-4">
                            <span className="panel-title">Actual</span>
                        </div>
                        <pre className="px-4 py-4 font-mono text-[13px] leading-relaxed text-fog">
                            <code>Code Actual Output</code>
                        </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}

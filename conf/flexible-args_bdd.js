export function describeFlexibleArgs(dependencies) {
    const { assert, jsTokenEvalResult, flexibleArgs, governedArgs } = dependencies;

    const syntheticScalarHook = "synthetic";
    const syntheticArrayHook = ["synthetic"];
    const syntheticObjectHook = { synthetic: "yes" };
    function syntheticFunctionHook() { }
    class SyntheticClassHook { }

    describe("universal-eval", () => {
        const igoreResult = () => { };
        const evalInThisScope = (js) => eval(js);

        it("jsTokenEvalResult (invalid)", () => {
            let badValues = 0;
            jsTokenEvalResult("alert('potential attack foiled!'))", eval, igoreResult, () => { badValues++ });
            jsTokenEvalResult("badFunction", eval, igoreResult, undefined, (error) => { badValues++ });
            assert(badValues == 2);
        });

        it("jsTokenEvalResult (class)", () => {
            const synthetic = jsTokenEvalResult("SyntheticClassHook", evalInThisScope);
            assert(synthetic === SyntheticClassHook);
        });

        it("jsTokenEvalResult (function)", () => {
            const synthetic = jsTokenEvalResult("syntheticFunctionHook", evalInThisScope);
            assert(synthetic === syntheticFunctionHook);
        });

        it("jsTokenEvalResult (values)", () => {
            let synthetic = jsTokenEvalResult("syntheticScalarHook", evalInThisScope);
            assert(synthetic === syntheticScalarHook);
            synthetic = jsTokenEvalResult("syntheticArrayHook", evalInThisScope);
            assert(synthetic === syntheticArrayHook);
            synthetic = jsTokenEvalResult("syntheticObjectHook", evalInThisScope);
            assert(synthetic === syntheticObjectHook);
        });
    });

    describe("universal-args", () => {
        it("flexibleArgs with no supplied args and rules object", () => {
            const result = flexibleArgs(undefined, { defaultArgs: { test: "value" } });
            assert(result);
            assert(typeof result === "object");
            assert(result.args.test == "value");
            assert(result.rules.defaultArgs.test == "value");
        });

        it("flexibleArgs with supplied args and rules function", () => {
            const result = flexibleArgs(
                { another: "value" },
                () => ({ defaultArgs: { fromDefaults: "value" } }));  // rules can be a function
            assert(result.args.fromDefaults == "value");
            assert(result.args.another == "value");
            assert(result.rules.defaultArgs.fromDefaults == "value");
        });

        it("flexibleArgs with supplied args function and rules function", () => {
            const result = flexibleArgs(
                (defaults) => ({ ...defaults, another: "value" }), // if argsSupplier is a function, very important that ...defaults is spread
                () => ({ defaultArgs: (rules, args, argsSupplier) => ({ test: "value" }) }));       // rules can be a function, and so can defaultArgs
            assert(result.args.test == "value");    // from defaultArgs
            assert(result.args.another == "value"); // from argsSupplier
        });

        it("governedArgs", () => {
            governedArgs({ test: "value" }, {
                hookableDomElemsAttrName: "universal-test-hook-fn",
                consumeArgs: ({ args }) => {
                    assert(args.test == "value");
                }
            });
        });
    });
}

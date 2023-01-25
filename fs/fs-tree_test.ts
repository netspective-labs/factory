import { path } from "./deps.ts";
import { testingAsserts as ta } from "./deps-test.ts";
import * as mod from "./fs-tree.ts";

// TODO: create proper test cases which generate random, but predictably
// testable, directories and files with mixture of *.md, *.ts, *.html, *.png,
// etc. files that can then be parsed by FileSysAssetsTree

// use guidlines in:
// https://stackoverflow.com/questions/13400312/linux-create-random-directory-file-hierarchy/13401143
// > mkdir -p {a,b}/{e,f,g}/{h,i,j}
// ├───a
// │   ├───e
// │   │   ├───h
// │   │   ├───i
// │   │   └───j
// │   ├───f
// │   │   ├───h
// │   │   ├───i
// │   │   └───j
// │   └───g
// │       ├───h
// │       ├───i
// │       └───j
// └───b
//     ├───e
//     │   ├───h
//     │   ├───i
//     │   └───j
//     ├───f
//     │   ├───h
//     │   ├───i
//     │   └───j
//     └───g
//         ├───h
//         ├───i
//         └───j

const testPathAbs = path.dirname(path.fromFileUrl(import.meta.url));
const _testPathRel = path.relative(Deno.cwd(), testPathAbs);

Deno.test("TODO: filesystem tree", async () => {
  const assetsTree = new mod.FileSysAssetsTree();
  const srcRoot = testPathAbs;
  const _src = await assetsTree.consumeAssets({
    identity: "content",
    root: srcRoot,
    rootIsAbsolute: path.isAbsolute(srcRoot),
    options: {
      followSymlinks: true,
    },
  });
  const destRoot = testPathAbs;
  const _dest = await assetsTree.consumeAssets({
    identity: "public",
    root: destRoot,
    rootIsAbsolute: path.isAbsolute(destRoot),
    options: {
      followSymlinks: false,
    },
  });
  ta.assertEquals(assetsTree.assets.length, 2);
  // for (const node of src.subdirectories()) {
  //   let fc = 0;
  //   for (const _f of node.files()) fc++;
  //   console.log(
  //     node.level,
  //     node.qualifiedPath,
  //     fc,
  //   );
  // }
  // result.walkNodes(src, (node) => {
  //   console.log(node.level, node.unit, node.children.length);
  //   return true;
  // });
});

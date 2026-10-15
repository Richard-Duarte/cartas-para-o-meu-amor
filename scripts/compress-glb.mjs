/* eslint-disable */
// @ts-nocheck
// Build step: compress every source GLB in public/models -> dist/models (meshopt + webp), run after vite build.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRDracoMeshCompression, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import fs from 'fs'; import path from 'path';
const src = process.argv[2] || 'public/models', out = process.argv[3] || 'dist/models';
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
fs.mkdirSync(out, { recursive: true });
let a = 0, b = 0;
for (const f of fs.readdirSync(src).filter(f => f.endsWith('.glb'))) {
  const doc = await io.read(path.join(src, f));
  doc.getRoot().listExtensionsUsed().forEach(e => e.extensionName === 'KHR_draco_mesh_compression' && e.dispose());
  await doc.transform(dedup(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
  const o = path.join(out, f); await io.write(o, doc);
  let s0 = fs.statSync(path.join(src, f)).size, s1 = fs.statSync(o).size;
  if (s1 >= s0) { fs.copyFileSync(path.join(src, f), o); s1 = s0; console.log('  keep draco source (smaller):', f); } a += s0; b += s1;
  console.log(f.padEnd(12), (s0/1024|0)+'K ->', (s1/1024|0)+'K');
}
console.log('TOTAL', (a/1048576).toFixed(2)+'MB ->', (b/1048576).toFixed(2)+'MB');

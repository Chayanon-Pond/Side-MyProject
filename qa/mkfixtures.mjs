import { pathToFileURL } from 'url';
import { createRequire } from 'module'; const sharp = createRequire('D:/my-project/Side-MyProject/server/package.json')('sharp');
const mk = (w,h,c,txt,f) => sharp({ create:{width:w,height:h,channels:3,background:c}})
  .composite([{input:Buffer.from(`<svg width="${w}" height="${h}"><text x="50%" y="50%" font-size="${Math.round(h/6)}" text-anchor="middle" fill="white" font-family="Arial">${txt}</text></svg>`)}]).toFile(f);
await mk(1600,900,'#c2410c','COVER','fixtures/cover.jpg');
await mk(1200,800,'#1d4ed8','G1','fixtures/g1.png');
await mk(1200,800,'#15803d','G2','fixtures/g2.png');
await mk(1200,800,'#7e22ce','G3','fixtures/g3.png');
await mk(400,400,'#0f766e','AV','fixtures/avatar.png');
await mk(800,500,'#be123c','INLINE','fixtures/inline.png');
console.log('ok');

const fs = require('fs');
const { Resvg } = require('@resvg/resvg-js');
const pngToIcoModule = require('png-to-ico');
const pngToIco = pngToIcoModule.default || pngToIcoModule;

(async () => {
  const svg = fs.readFileSync('public/nosugar.svg', 'utf8');
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 512 } });
  const pngData = resvg.render().asPng();
  const pngPath = 'public/nosugar-favicon-source.png';
  fs.writeFileSync(pngPath, pngData);
  const ico = await pngToIco([pngPath]);
  fs.writeFileSync('src/app/favicon.ico', ico);
  fs.unlinkSync(pngPath);
  console.log('created src/app/favicon.ico');
})();

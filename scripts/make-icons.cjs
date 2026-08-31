// Original code-drawn VB monogram. No external artwork or build dependencies.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const out = path.resolve(__dirname, '../assets/icons');
fs.mkdirSync(out, {recursive:true});
function crc32(bytes) {
  let crc = 0xffffffff;
  for(const byte of bytes) { crc ^= byte; for(let n=0;n<8;n++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, bytes) {
  const name = Buffer.from(type), size = Buffer.alloc(4), crc = Buffer.alloc(4);
  size.writeUInt32BE(bytes.length); crc.writeUInt32BE(crc32(Buffer.concat([name,bytes])));
  return Buffer.concat([size,name,bytes,crc]);
}
function icon(size) {
  const letters=['10001011110','10001010001','10001010001','10001011110','10001010001','01010010001','00100011110'];
  const unit=size/19, startX=(size-11*unit)/2, startY=(size-7*unit)/2;
  const pixels=Buffer.alloc((size*3+1)*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const col=Math.floor((x-startX)/unit), row=Math.floor((y-startY)/unit);
    const fill=row>=0&&row<7&&col>=0&&col<11&&letters[row][col]==='1';
    const rgb=fill?[255,179,77]:[17,16,15], offset=y*(size*3+1)+1+x*3;
    rgb.forEach((value,i)=>{pixels[offset+i]=value;});
  }
  const header=Buffer.alloc(13); header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);
}
for(const size of [180,192,512])fs.writeFileSync(path.join(out,`icon-${size}.png`),icon(size));
fs.writeFileSync(path.join(out,'icon-maskable-512.png'),icon(512));

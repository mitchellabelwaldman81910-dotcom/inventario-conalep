/* Codificador QR propio (modo alfanumérico o bytes UTF-8, niveles L/M/Q/H) */
const QR=(()=>{
  const ECC=[
    [-1,7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
    [-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28],
    [-1,13,22,18,26,18,24,18,22,20,24,28,26,24,20,30,24,28,28,26,30,28,30,30,30,30,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
    [-1,17,28,22,16,22,28,26,26,24,28,24,28,22,24,24,30,28,28,26,28,30,24,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30]];
  const NB=[
    [-1,1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25],
    [-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49],
    [-1,1,1,2,2,4,4,6,6,8,8,8,10,12,16,12,17,16,18,21,20,23,23,25,27,29,34,34,35,38,40,43,45,48,51,53,56,59,62,65,68],
    [-1,1,1,2,4,4,4,5,6,8,8,11,11,16,16,18,16,19,21,25,25,25,34,30,32,35,37,40,42,45,48,51,54,57,60,63,66,70,74,77,81]];
  const LV={L:0,M:1,Q:2,H:3},FB=[1,0,3,2];
  const AL="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
  const bit=(x,i)=>((x>>>i)&1)!==0;
  function raw(v){let r=(16*v+128)*v+64;if(v>=2){const n=Math.floor(v/7)+2;r-=(25*n-10)*n-55;if(v>=7)r-=36}return r}
  const dataCw=(v,e)=>Math.floor(raw(v)/8)-ECC[e][v]*NB[e][v];
  function mul(x,y){let z=0;for(let i=7;i>=0;i--){z=(z<<1)^((z>>>7)*0x11D);z^=((y>>>i)&1)*x}return z}
  function rsDiv(d){const r=new Array(d).fill(0);r[d-1]=1;let root=1;for(let i=0;i<d;i++){for(let j=0;j<d;j++){r[j]=mul(r[j],root);if(j+1<d)r[j]^=r[j+1]}root=mul(root,2)}return r}
  function rsRem(data,dv){const res=dv.map(()=>0);for(const b of data){const f=b^res.shift();res.push(0);dv.forEach((c,i)=>res[i]^=mul(c,f))}return res}
  function utf8(s){return Array.from(new TextEncoder().encode(s))}
  function alignPos(v){if(v===1)return[];const n=Math.floor(v/7)+2,step=v===32?26:Math.ceil((v*4+4)/(n*2-2))*2,r=[6];for(let p=v*4+10;r.length<n;p-=step)r.splice(1,0,p);return r}

  function encode(text,level){
    const e=LV[level];if(e===undefined)throw new Error("nivel");
    const isA=[...text].every(c=>AL.includes(c));
    const seg=[];const pb=(arr,v,n)=>{for(let i=n-1;i>=0;i--)arr.push((v>>>i)&1)};
    let count;
    if(isA){count=text.length;for(let i=0;i+1<text.length;i+=2)pb(seg,AL.indexOf(text[i])*45+AL.indexOf(text[i+1]),11);if(text.length%2)pb(seg,AL.indexOf(text[text.length-1]),6)}
    else{const b=utf8(text);count=b.length;b.forEach(x=>pb(seg,x,8))}
    let ver=1,cc;
    for(;;ver++){
      if(ver>40)throw new Error("demasiado largo");
      cc=isA?(ver<10?9:ver<27?11:13):(ver<10?8:16);
      if(count<(1<<cc)&&4+cc+seg.length<=dataCw(ver,e)*8)break;
    }
    const bits=[];pb(bits,isA?2:4,4);pb(bits,count,cc);bits.push(...seg);
    const cap=dataCw(ver,e)*8;
    pb(bits,0,Math.min(4,cap-bits.length));pb(bits,0,(8-bits.length%8)%8);
    for(let p=0xEC;bits.length<cap;p^=0xEC^0x11)pb(bits,p,8);
    const data=[];for(let i=0;i<bits.length;i+=8){let v=0;for(let j=0;j<8;j++)v=v<<1|bits[i+j];data.push(v)}
    // bloques + corrección de errores + intercalado
    const nb=NB[e][ver],be=ECC[e][ver],rc=Math.floor(raw(ver)/8),ns=nb-rc%nb,sl=Math.floor(rc/nb),dv=rsDiv(be),blocks=[];
    for(let i=0,k=0;i<nb;i++){const d=data.slice(k,k+sl-be+(i<ns?0:1));k+=d.length;const ec=rsRem(d,dv);if(i<ns)d.push(0);blocks.push(d.concat(ec))}
    const cw=[];for(let i=0;i<blocks[0].length;i++)blocks.forEach((b,j)=>{if(i!==sl-be||j>=ns)cw.push(b[i])});
    // matriz
    const N=ver*4+17,M=[],F=[];for(let i=0;i<N;i++){M.push(new Array(N).fill(false));F.push(new Array(N).fill(false))}
    const sf=(x,y,d)=>{M[y][x]=d;F[y][x]=true};
    for(let i=0;i<N;i++){sf(6,i,i%2===0);sf(i,6,i%2===0)}
    const finder=(x,y)=>{for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const d=Math.max(Math.abs(dx),Math.abs(dy)),xx=x+dx,yy=y+dy;if(xx>=0&&xx<N&&yy>=0&&yy<N)sf(xx,yy,d!==2&&d!==4)}};
    finder(3,3);finder(N-4,3);finder(3,N-4);
    const ap=alignPos(ver),na=ap.length;
    for(let i=0;i<na;i++)for(let j=0;j<na;j++){if((i===0&&j===0)||(i===0&&j===na-1)||(i===na-1&&j===0))continue;
      for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)sf(ap[i]+dx,ap[j]+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1)}
    const drawFormat=mask=>{const d=FB[e]<<3|mask;let r=d;for(let i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);const b=(d<<10|r)^0x5412;
      for(let i=0;i<=5;i++)sf(8,i,bit(b,i));sf(8,7,bit(b,6));sf(8,8,bit(b,7));sf(7,8,bit(b,8));
      for(let i=9;i<15;i++)sf(14-i,8,bit(b,i));
      for(let i=0;i<8;i++)sf(N-1-i,8,bit(b,i));
      for(let i=8;i<15;i++)sf(8,N-15+i,bit(b,i));
      sf(8,N-8,true)};
    drawFormat(0);
    if(ver>=7){let r=ver;for(let i=0;i<12;i++)r=(r<<1)^((r>>>11)*0x1F25);const b=ver<<12|r;
      for(let i=0;i<18;i++){const t=bit(b,i),a=N-11+i%3,c=Math.floor(i/3);sf(a,c,t);sf(c,a,t)}}
    let i=0;
    for(let right=N-1;right>=1;right-=2){if(right===6)right=5;
      for(let vert=0;vert<N;vert++)for(let j=0;j<2;j++){const x=right-j,up=((right+1)&2)===0,y=up?N-1-vert:vert;
        if(!F[y][x]&&i<cw.length*8){M[y][x]=bit(cw[i>>>3],7-(i&7));i++}}}
    const MK=[(x,y)=>(x+y)%2===0,(x,y)=>y%2===0,(x,y)=>x%3===0,(x,y)=>(x+y)%3===0,(x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0,
      (x,y)=>x*y%2+x*y%3===0,(x,y)=>(x*y%2+x*y%3)%2===0,(x,y)=>((x+y)%2+x*y%3)%2===0];
    const apply=m=>{for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(!F[y][x]&&MK[m](x,y))M[y][x]=!M[y][x]};
    const P1=[true,false,true,true,true,false,true,false,false,false,false],P2=P1.slice().reverse();
    function penalty(){let p=0,dark=0;
      const line=get=>{let run=1;for(let k=1;k<N;k++){if(get(k)===get(k-1)){run++;if(run===5)p+=3;else if(run>5)p++}else run=1}
        for(let k=0;k+11<=N;k++){let a=true,b=true;for(let t=0;t<11;t++){const v=get(k+t);if(v!==P1[t])a=false;if(v!==P2[t])b=false}if(a)p+=40;if(b)p+=40}};
      for(let y=0;y<N;y++)line(k=>M[y][k]);for(let x=0;x<N;x++)line(k=>M[k][x]);
      for(let y=0;y+1<N;y++)for(let x=0;x+1<N;x++){const c=M[y][x];if(c===M[y][x+1]&&c===M[y+1][x]&&c===M[y+1][x+1])p+=3}
      for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(M[y][x])dark++;
      p+=(Math.ceil(Math.abs(dark*20-N*N*10)/(N*N))-1)*10;return p}
    let best=0,bp=Infinity;
    for(let m=0;m<8;m++){apply(m);drawFormat(m);const p=penalty();if(p<bp){bp=p;best=m}apply(m)}
    apply(best);drawFormat(best);
    return{version:ver,getModuleCount:()=>N,isDark:(r,c)=>M[r][c]};
  }
  return{encode};
})();

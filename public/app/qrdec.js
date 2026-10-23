/* Lector QR propio: QRDec.decode({data:RGBA,width,height}) -> texto o null.
   Detecta las 3 esquinas, corrige giro y perspectiva, lee formato, quita máscara,
   repara errores (Reed-Solomon) y decodifica numérico / alfanumérico / bytes. */
const QRDec=(()=>{
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
  const FB=[1,0,3,2]; // nivel (L,M,Q,H) -> bits de formato
  const AL="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
  const bit=(x,i)=>((x>>>i)&1)!==0;
  function raw(v){let r=(16*v+128)*v+64;if(v>=2){const n=Math.floor(v/7)+2;r-=(25*n-10)*n-55;if(v>=7)r-=36}return r}
  function alignPos(v){if(v===1)return[];const n=Math.floor(v/7)+2,step=v===32?26:Math.ceil((v*4+4)/(n*2-2))*2,r=[6];for(let p=v*4+10;r.length<n;p-=step)r.splice(1,0,p);return r}

  /* ---------- Reed-Solomon sobre GF(256) ---------- */
  const EXP=new Uint8Array(512),LOG=new Uint8Array(256);
  (()=>{let x=1;for(let i=0;i<255;i++){EXP[i]=x;LOG[x]=i;x<<=1;if(x&256)x^=0x11D}for(let i=255;i<512;i++)EXP[i]=EXP[i-255]})();
  const gmul=(a,b)=>a&&b?EXP[LOG[a]+LOG[b]]:0;
  const gdiv=(a,b)=>a?EXP[(LOG[a]+255-LOG[b])%255]:0;
  function rsCorrect(cw,nsym){
    const n=cw.length,S=new Array(nsym).fill(0);let any=false;
    for(let j=0;j<nsym;j++){let s=0;for(let i=0;i<n;i++)s=gmul(s,EXP[j])^cw[i];S[j]=s;if(s)any=true}
    if(!any)return true;
    let C=[1],B=[1],L=0,m=1,b=1;
    for(let i=0;i<nsym;i++){
      let d=S[i];for(let k=1;k<=L;k++)d^=gmul(C[k]||0,S[i-k]);
      if(d===0){m++;continue}
      const T=C.slice(),coef=gdiv(d,b);
      while(C.length<B.length+m)C.push(0);
      for(let k=0;k<B.length;k++)C[k+m]^=gmul(coef,B[k]);
      if(2*L<=i){L=i+1-L;B=T;b=d;m=1}else m++;
    }
    while(C.length&&C[C.length-1]===0)C.pop();
    if(L===0||L*2>nsym||C.length-1!==L)return false;
    const pos=[];
    for(let p=0;p<n;p++){let v=0;for(let k=0;k<C.length;k++)v^=gmul(C[k],EXP[((255-p)*k)%255]);if(v===0)pos.push(p)}
    if(pos.length!==L)return false;
    // Omega = S(x)*C(x) mod x^nsym
    const Om=new Array(nsym).fill(0);
    for(let i=0;i<nsym;i++)for(let k=0;k<C.length&&k<=i;k++)Om[i]^=gmul(C[k],S[i-k]);
    for(const p of pos){
      const X=EXP[p],Xi=EXP[(255-p)%255];
      let num=0;for(let k=0;k<nsym;k++)num^=gmul(Om[k],EXP[((255-p)*k)%255]);
      let den=0;for(let k=1;k<C.length;k+=2)den^=gmul(C[k],EXP[((255-p)*(k-1))%255]);
      if(den===0)return false;
      cw[n-1-p]^=gmul(X,gdiv(num,den));
    }
    for(let j=0;j<nsym;j++){let s=0;for(let i=0;i<n;i++)s=gmul(s,EXP[j])^cw[i];if(s)return false}
    return true;
  }

  /* ---------- formato ---------- */
  const FMT=[];
  for(let ec=0;ec<4;ec++)for(let mk=0;mk<8;mk++){const d=FB[ec]<<3|mk;let r=d;for(let i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);FMT.push({w:((d<<10)|r)^0x5412,ec,mk})}
  const pop=x=>{let c=0;while(x){c+=x&1;x>>>=1}return c};
  const MK=[(x,y)=>(x+y)%2===0,(x,y)=>y%2===0,(x,y)=>x%3===0,(x,y)=>(x+y)%3===0,(x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0,
    (x,y)=>x*y%2+x*y%3===0,(x,y)=>(x*y%2+x*y%3)%2===0,(x,y)=>((x+y)%2+x*y%3)%2===0];
  const funcCache={};
  function funcMask(ver){
    if(funcCache[ver])return funcCache[ver];
    const N=ver*4+17,F=[];for(let i=0;i<N;i++)F.push(new Uint8Array(N));
    const mark=(x,y)=>{if(x>=0&&x<N&&y>=0&&y<N)F[y][x]=1};
    for(let i=0;i<N;i++){mark(6,i);mark(i,6)}
    const fin=(x,y)=>{for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++)mark(x+dx,y+dy)};
    fin(3,3);fin(N-4,3);fin(3,N-4);
    const ap=alignPos(ver),na=ap.length;
    for(let i=0;i<na;i++)for(let j=0;j<na;j++){if((i===0&&j===0)||(i===0&&j===na-1)||(i===na-1&&j===0))continue;
      for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)mark(ap[i]+dx,ap[j]+dy)}
    for(let i=0;i<=5;i++)mark(8,i);mark(8,7);mark(8,8);mark(7,8);for(let i=9;i<15;i++)mark(14-i,8);
    for(let i=0;i<8;i++)mark(N-1-i,8);for(let i=8;i<15;i++)mark(8,N-15+i);mark(8,N-8);
    if(ver>=7)for(let i=0;i<18;i++){const a=N-11+i%3,c=Math.floor(i/3);mark(a,c);mark(c,a)}
    return funcCache[ver]=F;
  }

  /* ---------- de la matriz de módulos al texto ---------- */
  function readFormat(M,N){
    let a=0,b=0;
    const g=(x,y)=>M(x,y)?1:0;
    for(let i=0;i<=5;i++)a|=g(8,i)<<i;a|=g(8,7)<<6;a|=g(8,8)<<7;a|=g(7,8)<<8;for(let i=9;i<15;i++)a|=g(14-i,8)<<i;
    for(let i=0;i<8;i++)b|=g(N-1-i,8)<<i;for(let i=8;i<15;i++)b|=g(8,N-15+i)<<i;
    let best=null,bd=99;
    for(const f of FMT){const d=Math.min(pop(f.w^a),pop(f.w^b));if(d<bd){bd=d;best=f}}
    return bd<=3?best:null;
  }
  function parseData(d,ver){
    let p=0;const total=d.length*8;
    const rd=n=>{let v=0;for(let i=0;i<n;i++){const by=d[p>>>3];v=v<<1|((by>>>(7-(p&7)))&1);p++}return v};
    let out="";const bytes=[];
    const flush=()=>{if(bytes.length){try{out+=new TextDecoder("utf-8",{fatal:true}).decode(new Uint8Array(bytes))}catch(e){out+=String.fromCharCode(...bytes)}bytes.length=0}};
    while(p+4<=total){
      const mode=rd(4);
      if(mode===0)break;
      if(mode===7){const f=rd(8);let n=1;if((f&0x80)===0)n=1;else if((f&0xC0)===0x80)n=2;else n=3;for(let i=1;i<n;i++)rd(8);continue}
      if(mode===1){const cc=rd(ver<10?10:ver<27?12:14);flush();let c=cc;while(c>=3){out+=String(rd(10)).padStart(3,"0");c-=3}if(c===2)out+=String(rd(7)).padStart(2,"0");else if(c===1)out+=String(rd(4))}
      else if(mode===2){const cc=rd(ver<10?9:ver<27?11:13);flush();let c=cc;while(c>=2){const v=rd(11);out+=AL[Math.floor(v/45)]+AL[v%45];c-=2}if(c===1)out+=AL[rd(6)]}
      else if(mode===4){const cc=rd(ver<10?8:16);for(let i=0;i<cc;i++){if(p+8>total)return null;bytes.push(rd(8))}}
      else return null;
    }
    flush();return out;
  }
  function decodeMatrix(M,N){
    if((N-17)%4)return null;
    const ver=(N-17)/4;if(ver<1||ver>40)return null;
    const f=readFormat(M,N);if(!f)return null;
    const F=funcMask(ver),mk=MK[f.mk],ec=f.ec;
    const total=Math.floor(raw(ver)/8),bits=new Uint8Array(total);
    let i=0;
    for(let right=N-1;right>=1;right-=2){if(right===6)right=5;
      for(let vert=0;vert<N;vert++)for(let j=0;j<2;j++){const x=right-j,up=((right+1)&2)===0,y=up?N-1-vert:vert;
        if(!F[y][x]&&i<total*8){let v=M(x,y);if(mk(x,y))v=!v;if(v)bits[i>>>3]|=0x80>>>(i&7);i++}}}
    const nb=NB[ec][ver],be=ECC[ec][ver],ns=nb-total%nb,sl=Math.floor(total/nb);
    const blocks=[];for(let j=0;j<nb;j++)blocks.push(new Array(sl+1).fill(0));
    let k=0;
    for(let r=0;r<=sl;r++)for(let j=0;j<nb;j++){if(r===sl-be&&j<ns)continue;if(r===sl&&j<ns)continue;blocks[j][r]=bits[k++]}
    const data=[];
    for(let j=0;j<nb;j++){
      let b=blocks[j];
      if(j<ns){b=b.slice(0,sl-be).concat(b.slice(sl-be+1,sl+1))}
      if(!rsCorrect(b,be))return null;
      for(let t=0;t<b.length-be;t++)data.push(b[t]);
    }
    return parseData(data,ver);
  }

  /* ---------- imagen -> blanco/negro ---------- */
  function binarize(img,thr){
    const w=img.width,h=img.height,d=img.data,g=new Uint8Array(w*h);
    for(let i=0,p=0;i<g.length;i++,p+=4)g[i]=(d[p]*77+d[p+1]*150+d[p+2]*29)>>8;
    const W=w+1,I=new Uint32Array(W*(h+1));
    for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){row+=g[y*w+x];I[(y+1)*W+x+1]=I[y*W+x+1]+row}}
    const s=Math.max(15,((Math.min(w,h)/8)|0)|1),r=s>>1,bin=new Uint8Array(w*h);
    for(let y=0;y<h;y++){const y0=Math.max(0,y-r),y1=Math.min(h-1,y+r);
      for(let x=0;x<w;x++){const x0=Math.max(0,x-r),x1=Math.min(w-1,x+r);
        const sum=I[(y1+1)*W+x1+1]-I[y0*W+x1+1]-I[(y1+1)*W+x0]+I[y0*W+x0],area=(x1-x0+1)*(y1-y0+1);
        bin[y*w+x]=g[y*w+x]*area<sum*thr?1:0}}
    return bin;
  }

  /* ---------- esquinas (patrón 1:1:3:1:1) ---------- */
  function lineRuns(bin,w,h,x,y,dx,dy){
    const at=i=>{const xx=x+dx*i,yy=y+dy*i;return xx<0||yy<0||xx>=w||yy>=h?-1:bin[yy*w+xx]};
    const c=[0,0,0,0,0];let n1=0,n2=0,i=0;
    while(at(-i)===1){n1++;i++}
    if(at(-i)===-1)return null;
    while(at(-i)===0){c[1]++;i++}
    if(at(-i)===-1)return null;
    while(at(-i)===1){c[0]++;i++}
    let j=1;while(at(j)===1){n2++;j++}
    if(at(j)===-1)return null;
    while(at(j)===0){c[3]++;j++}
    if(at(j)===-1)return null;
    while(at(j)===1){c[4]++;j++}
    c[2]=n1+n2;
    return{c,off:(n2-(n1-1))/2,total:c[0]+c[1]+c[2]+c[3]+c[4]};
  }
  function lineRunsDir(bin,w,h,x,y,ux,uy){
    const at=i=>{const xx=Math.round(x+ux*i),yy=Math.round(y+uy*i);return xx<0||yy<0||xx>=w||yy>=h?-1:bin[yy*w+xx]};
    const c=[0,0,0,0,0];let n1=0,n2=0,i=0;
    while(at(-i)===1){n1++;i++}
    if(at(-i)===-1)return null;
    while(at(-i)===0){c[1]++;i++}
    if(at(-i)===-1)return null;
    while(at(-i)===1){c[0]++;i++}
    let j=1;while(at(j)===1){n2++;j++}
    if(at(j)===-1)return null;
    while(at(j)===0){c[3]++;j++}
    if(at(j)===-1)return null;
    while(at(j)===1){c[4]++;j++}
    c[2]=n1+n2;
    return{c,total:c[0]+c[1]+c[2]+c[3]+c[4]};
  }
  const okFinder=(c,tolF)=>{const t=c[0]+c[1]+c[2]+c[3]+c[4];if(t<7)return false;const m=t/7,tol=m*tolF;
    return Math.abs(c[0]-m)<tol&&Math.abs(c[1]-m)<tol&&Math.abs(c[2]-3*m)<3*tol&&Math.abs(c[3]-m)<tol&&Math.abs(c[4]-m)<tol};
  function findFinders(bin,w,h){
    const cands=[],step=h>480?2:1;
    for(let y=0;y<h;y+=step){
      const runs=[];let x=0;
      while(x<w){const col=bin[y*w+x];let s=x;while(x<w&&bin[y*w+x]===col)x++;runs.push([col,s,x-s])}
      for(let i=0;i+4<runs.length;i++){
        if(runs[i][0]!==1)continue;
        const c=[runs[i][2],runs[i+1][2],runs[i+2][2],runs[i+3][2],runs[i+4][2]];
        if(!okFinder(c,0.65))continue;
        const tot=c[0]+c[1]+c[2]+c[3]+c[4],cx0=runs[i+2][1]+runs[i+2][2]/2;
        const v=lineRuns(bin,w,h,Math.floor(cx0),y,0,1);
        if(!v||!okFinder(v.c,0.65)||Math.abs(v.total-tot)>tot*0.5)continue;
        const cy=y+v.off,hh=lineRuns(bin,w,h,Math.floor(cx0),Math.round(cy),1,0);
        if(!hh||!okFinder(hh.c,0.65))continue;
        const cx=Math.floor(cx0)+hh.off,ms=(hh.total+v.total)/14;
        let hit=null;
        for(const k of cands)if(Math.abs(k.x-cx)<=k.ms*1.2&&Math.abs(k.y-cy)<=k.ms*1.2&&Math.abs(k.ms-ms)<=k.ms*0.5){hit=k;break}
        if(hit){const n=hit.n;hit.x=(hit.x*n+cx)/(n+1);hit.y=(hit.y*n+cy)/(n+1);hit.ms=(hit.ms*n+ms)/(n+1);hit.n=n+1}
        else cands.push({x:cx,y:cy,ms,n:1});
      }
    }
    return cands;
  }

  /* ---------- geometría ---------- */
  function homography(src,dst){ // 4 pares (u,v)->(x,y)
    const A=[],b=[];
    for(let i=0;i<4;i++){const[u,v]=src[i],[x,y]=dst[i];
      A.push([u,v,1,0,0,0,-u*x,-v*x]);b.push(x);
      A.push([0,0,0,u,v,1,-u*y,-v*y]);b.push(y)}
    for(let c=0;c<8;c++){
      let p=c;for(let r=c+1;r<8;r++)if(Math.abs(A[r][c])>Math.abs(A[p][c]))p=r;
      if(Math.abs(A[p][c])<1e-12)return null;
      [A[c],A[p]]=[A[p],A[c]];[b[c],b[p]]=[b[p],b[c]];
      for(let r=0;r<8;r++){if(r===c)continue;const f=A[r][c]/A[c][c];if(!f)continue;for(let k=c;k<8;k++)A[r][k]-=f*A[c][k];b[r]-=f*b[c]}
    }
    const h=b.map((v,i)=>v/A[i][i]);
    return(u,v)=>{const d=h[6]*u+h[7]*v+1;return[(h[0]*u+h[1]*v+h[2])/d,(h[3]*u+h[4]*v+h[5])/d]};
  }
  function findAlign(bin,w,h,ex,ey,ms){
    const R=Math.ceil(ms*5),best=[];
    for(let y=Math.max(0,Math.round(ey-R));y<=Math.min(h-1,Math.round(ey+R));y++)
      for(let x=Math.max(0,Math.round(ex-R));x<=Math.min(w-1,Math.round(ex+R));x++){
        if(!bin[y*w+x])continue;
        const a=lineRuns(bin,w,h,x,y,1,0);if(!a)continue;
        const m=ms,t=0.55*m;
        const ok=c=>Math.abs(c[1]-m)<t&&Math.abs(c[2]-m)<t&&Math.abs(c[3]-m)<t&&c[0]>=m*0.45&&c[4]>=m*0.45;
        if(!ok(a.c))continue;
        const v=lineRuns(bin,w,h,Math.floor(x+a.off),y,0,1);if(!v||!ok(v.c))continue;
        best.push([x+a.off,y+v.off]);
      }
    if(!best.length)return null;
    let sx=0,sy=0,n=0,b0=best.reduce((p,q)=>Math.hypot(p[0]-ex,p[1]-ey)<=Math.hypot(q[0]-ex,q[1]-ey)?p:q);
    for(const q of best)if(Math.hypot(q[0]-b0[0],q[1]-b0[1])<ms*2){sx+=q[0];sy+=q[1];n++}
    return[sx/n,sy/n];
  }
  function trySample(bin,w,h,TL,TR,BL){
    const dTR=Math.hypot(TR.x-TL.x,TR.y-TL.y),dBL=Math.hypot(BL.x-TL.x,BL.y-TL.y);
    const along=(p,q)=>{const L=Math.hypot(q.x-p.x,q.y-p.y),r=lineRunsDir(bin,w,h,p.x,p.y,(q.x-p.x)/L,(q.y-p.y)/L);return r&&okFinder(r.c,0.8)?r.total/7:null};
    const ms_=[along(TL,TR),along(TL,BL),along(TR,TL),along(BL,TL)].filter(v=>v);
    const ms=ms_.length?ms_.reduce((a,b)=>a+b,0)/ms_.length:(TL.ms+TR.ms+BL.ms)/3/1.2;
    const n0=Math.round(((dTR+dBL)/2)/ms+7);
    const dims=[];const base=Math.round((n0-17)/4)*4+17;
    for(const N of [base,base+4,base-4,base+8,base-8])if(N>=21&&N<=177&&!dims.includes(N))dims.push(N);
    for(const N of dims){
      const ver=(N-17)/4;
      const aff=(u,v)=>[TL.x+(TR.x-TL.x)*(u-3.5)/(N-7)+(BL.x-TL.x)*(v-3.5)/(N-7),TL.y+(TR.y-TL.y)*(u-3.5)/(N-7)+(BL.y-TL.y)*(v-3.5)/(N-7)];
      const tries=[];
      if(ver>=2){
        const [ex,ey]=aff(N-6.5,N-6.5),al=findAlign(bin,w,h,ex,ey,(dTR/(N-7)+dBL/(N-7))/2);
        if(al)tries.push(homography([[3.5,3.5],[N-3.5,3.5],[3.5,N-3.5],[N-6.5,N-6.5]],[[TL.x,TL.y],[TR.x,TR.y],[BL.x,BL.y],al]));
      }
      tries.push(aff);
      for(const P of tries){
        if(!P)continue;
        const cache=new Int8Array(N*N).fill(-1);
        const px=(x,y)=>{const ix=Math.round(x),iy=Math.round(y);return ix<0||iy<0||ix>=w||iy>=h?0:bin[iy*w+ix]};
        const M=(c,r)=>{const k=r*N+c;if(cache[k]>=0)return cache[k]===1;
          let s=0;for(const[du,dv] of [[0,0],[.25,0],[-.25,0],[0,.25],[0,-.25]]){const[x,y]=P(c+.5+du,r+.5+dv);s+=px(x,y)}
          cache[k]=s>=3?1:0;return cache[k]===1};
        let txt=null;try{txt=decodeMatrix(M,N)}catch(e){txt=null}
        if(txt)return txt;
      }
    }
    return null;
  }
  function decodeBin(bin,w,h){
    let cands=findFinders(bin,w,h);
    let c=cands.filter(k=>k.n>=3);if(c.length<3)c=cands.filter(k=>k.n>=2);if(c.length<3)c=cands;
    c.sort((a,b)=>b.n-a.n);c=c.slice(0,12);
    const triples=[];
    for(let i=0;i<c.length;i++)for(let j=i+1;j<c.length;j++)for(let k=j+1;k<c.length;k++){
      const P=[c[i],c[j],c[k]],ms=P.map(p=>p.ms),mx=Math.max(...ms),mn=Math.min(...ms);
      if(mx>mn*1.6)continue;
      const d=[Math.hypot(P[1].x-P[2].x,P[1].y-P[2].y),Math.hypot(P[0].x-P[2].x,P[0].y-P[2].y),Math.hypot(P[0].x-P[1].x,P[0].y-P[1].y)]; // opuesto a cada vértice
      let tl=d.indexOf(Math.max(...d));
      const a=P[tl],o=P.filter((_,q)=>q!==tl),da=Math.hypot(o[0].x-a.x,o[0].y-a.y),db=Math.hypot(o[1].x-a.x,o[1].y-a.y);
      if(Math.min(da,db)<Math.max(da,db)*0.6)continue;
      const cosv=((o[0].x-a.x)*(o[1].x-a.x)+(o[0].y-a.y)*(o[1].y-a.y))/(da*db);
      if(Math.abs(cosv)>0.5)continue;
      const dist=(da+db)/2/((a.ms+o[0].ms+o[1].ms)/3);if(dist<12)continue;
      triples.push({a,o,score:Math.abs(cosv)+Math.abs(da-db)/Math.max(da,db)-0.1*(P[0].n+P[1].n+P[2].n)/Math.max(1,c[0].n)});
    }
    triples.sort((x,y)=>x.score-y.score);
    for(const t of triples.slice(0,6)){
      let [p,q]=t.o;
      const cross=(p.x-t.a.x)*(q.y-t.a.y)-(p.y-t.a.y)*(q.x-t.a.x);
      const TR=cross>0?p:q,BL=cross>0?q:p;
      const r=trySample(bin,w,h,t.a,TR,BL);
      if(r!==null&&r!==undefined)return r;
    }
    return null;
  }
  function decode(img,opts){
    const ths=(opts&&opts.thresholds)||[0.9,0.8,1.0];
    for(const th of ths){const bin=binarize(img,th);const r=decodeBin(bin,img.width,img.height);if(r)return r}
    return null;
  }
  return{decode,_rs:rsCorrect,_decodeMatrix:decodeMatrix};
})();
if(typeof module!=="undefined")module.exports=QRDec;
if(typeof window!=="undefined")window.QRDec=QRDec;

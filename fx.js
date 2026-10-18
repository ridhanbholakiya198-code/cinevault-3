/* CINEVAULT FX — WebGL hero (liquid dissolve, luminance parallax, lens, grain, fog), 3D card tilt, cursor, circular reveal.
   Pure add-on: reads the existing hero layers, never edits app.js logic. Falls back to the CSS hero if WebGL is missing. */
(()=>{"use strict";
const $=s=>document.querySelector(s),hx=$("#hx"),root=document.documentElement;
const RM=matchMedia("(prefers-reduced-motion:reduce)").matches,fine=matchMedia("(hover:hover) and (pointer:fine)").matches,M=innerWidth<700;
const low=(navigator.hardwareConcurrency||4)<=4&&(navigator.deviceMemory||4)<=2;

/* ---------- 1. WebGL hero ---------- */
function heroGL(){
 const cv=document.createElement("canvas");cv.id="gl";hx.insertBefore(cv,hx.querySelector(".hgr"));
 const gl=cv.getContext("webgl",{antialias:false,alpha:false,powerPreference:"high-performance"});if(!gl){cv.remove();return}
 const VS="attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
 const FS=`#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#define OCT ${(M||low)?3:5}
varying vec2 v;uniform sampler2D uA,uB;uniform vec2 uRes,uSa,uSb,uFa,uFb,uM;uniform float uT,uP,uS;uniform vec3 uAcc;
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<OCT;i++){s+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
vec3 pic(sampler2D t,vec2 sz,vec2 fo,vec2 uv,float k){
 float ra=uRes.x/uRes.y,ri=sz.x/sz.y;
 vec2 s=ra>ri?vec2(1.,ri/ra):vec2(ra/ri,1.);
 vec2 u=uv*s+(1.-s)*fo;
 float l=dot(texture2D(t,u).rgb,vec3(.299,.587,.114));
 u+=(uM-.5)*(l-.45)*.07*s;
 vec2 d=(v-uM)*vec2(ra,1.);
 float ca=.006*exp(-dot(d,d)*3.5)*(1.+k);
 vec2 o=normalize(d+1e-4)*ca*s;
 return vec3(texture2D(t,u+o).r,texture2D(t,u).g,texture2D(t,u-o).b);}
void main(){
 vec2 uv=v;
 float z=1.04+.015*sin(uT*.25)+.12*uS;
 vec2 c=(uv-.5)/z+.5;c+=(uM-.5)*.012;
 vec3 col;float bell=0.,k=0.;
 if(uP<.002){col=pic(uA,uSa,uFa,c,0.);}
 else{
  float nz=fbm(c*3.+uT*.04);
  float f=nz*.65+c.x*.35;
  k=smoothstep(f-.09,f+.09,uP*1.35-.14);
  bell=sin(clamp(uP,0.,1.)*3.1416);
  vec2 w=(vec2(fbm(c*5.+3.),fbm(c*5.-7.))-.5)*.10*bell;
  col=mix(pic(uA,uSa,uFa,c+w*(1.-k),0.),pic(uB,uSb,uFb,c-w*k,1.),k);
  col+=uAcc*(k*(1.-k)*4.)*.55*bell;}
 float lum=dot(col,vec3(.299,.587,.114));
 col=mix(col,col*(.55+.9*uAcc),.16);
 vec2 dm=(v-uM)*vec2(uRes.x/uRes.y,1.);
 col+=uAcc*exp(-dot(dm,dm)*7.)*.10;
 col+=pow(max(lum-.6,0.),2.)*uAcc*.35;
 float fg=fbm(vec2(c.x*2.2+uT*.035,c.y*3.-uT*.02));
 col=mix(col,uAcc*.45+.08,fg*smoothstep(.55,0.,uv.y)*.30);
 col*=smoothstep(1.25,.25,length((uv-.5)*vec2(1.15,1.)));
 col+=(h(uv*uRes+fract(uT)*91.7)-.5)*.075;
 gl_FragColor=vec4(col,1.);}`;
 const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(gl.getShaderParameter(o,gl.COMPILE_STATUS))return o;console.warn("[fx] shader:",gl.getShaderInfoLog(o));return null};
 const vs=sh(gl.VERTEX_SHADER,VS),fs=sh(gl.FRAGMENT_SHADER,FS);if(!vs||!fs){cv.remove();return}
 const pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,fs);gl.linkProgram(pr);
 if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){cv.remove();return}
 gl.useProgram(pr);
 const bf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
 const ap=gl.getAttribLocation(pr,"p");gl.enableVertexAttribArray(ap);gl.vertexAttribPointer(ap,2,gl.FLOAT,false,0,0);
 const U={};["uA","uB","uRes","uSa","uSb","uFa","uFb","uM","uT","uP","uS","uAcc"].forEach(n=>U[n]=gl.getUniformLocation(pr,n));
 gl.uniform1i(U.uA,0);gl.uniform1i(U.uB,1);
 const tex=im=>{let src=im;const m=Math.max(im.width,im.height);
  if(m>2400){const k=2400/m,c=document.createElement("canvas");c.width=im.width*k|0;c.height=im.height*k|0;c.getContext("2d").drawImage(im,0,0,c.width,c.height);src=c}
  const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);
  [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]].forEach(([a,b])=>gl.texParameteri(gl.TEXTURE_2D,a,b));
  return{t,w:src.width,h:src.height}};
 const free=x=>{if(x&&x!==A&&x!==B)gl.deleteTexture(x.t)};
 let A=null,B=null,p=0,t0=0,going=0,cur="",lastEl=null,m=[.5,.5],mt=[.5,.5],sc=0,acc=[.88,.63,.19],at=[.88,.63,.19],raf=0,vis=true,last=0;
 const load=u=>new Promise(r=>{const i=new Image();i.crossOrigin="anonymous";i.onload=()=>r(i);i.onerror=()=>r(null);i.src=u});
 async function sync(){
  const el=hx.querySelector(".hbg.on");if(!el)return;
  const cs=getComputedStyle(el),mm=/url\(["']?(.*?)["']?\)/.exec(cs.backgroundImage||"");if(!mm)return;
  const url=mm[1],bp=cs.backgroundPosition.split(" "),fo=[(parseFloat(bp[0])||50)/100,1-(parseFloat(bp[1])||50)/100];
  if(url===cur)return;cur=url;const same=el===lastEl;lastEl=el;
  const im=await load(url);if(!im||cur!==url)return;const T=tex(im);T.f=fo;
  if(!A){A=T;hx.classList.add("gl");kick();return}
  if(same){if(going){const o=B;B=T;free(o)}else{const o=A;A=T;free(o)}return}
  if(going){const o=A;A=B;free(o);going=0;p=0}
  B=T;going=1;t0=performance.now()}
 const rs=()=>{const d=Math.min(devicePixelRatio||1,M?1.25:2)*(low?.75:1),w=hx.clientWidth,h=hx.clientHeight;if(!w||!h)return;cv.width=w*d|0;cv.height=h*d|0;gl.viewport(0,0,cv.width,cv.height)};
 new ResizeObserver(rs).observe(hx);rs();
 const pa=()=>{const q=/(\d+)[^\d]+(\d+)[^\d]+(\d+)/.exec(getComputedStyle(root).getPropertyValue("--accent"));if(q)at=[q[1]/255,q[2]/255,q[3]/255]};setInterval(pa,400);pa();
 function draw(now){
  if(going){const x=Math.min(1,(now-t0)/1500);p=x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;if(x>=1){const o=A;A=B;free(o);going=0;p=0}}
  m[0]+=(mt[0]-m[0])*.07;m[1]+=(mt[1]-m[1])*.07;for(let i=0;i<3;i++)acc[i]+=(at[i]-acc[i])*.05;
  sc+=(Math.min(1,scrollY/innerHeight)-sc)*.1;
  const Bt=going?B:A;
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,A.t);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,Bt.t);
  gl.uniform2f(U.uRes,cv.width,cv.height);gl.uniform2f(U.uSa,A.w,A.h);gl.uniform2f(U.uSb,Bt.w,Bt.h);gl.uniform2f(U.uFa,A.f[0],A.f[1]);gl.uniform2f(U.uFb,Bt.f[0],Bt.f[1]);
  gl.uniform2f(U.uM,m[0],m[1]);gl.uniform1f(U.uT,now/1000);gl.uniform1f(U.uP,p);gl.uniform1f(U.uS,sc);gl.uniform3f(U.uAcc,acc[0],acc[1],acc[2]);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4)}
 const fps=(M||low)?30:60,loop=now=>{raf=0;if(!vis||document.hidden||!A)return;raf=requestAnimationFrame(loop);if(now-last<1000/fps-2)return;last=now;draw(now)};
 function kick(){if(!raf&&A&&vis&&!document.hidden)raf=requestAnimationFrame(loop)}
 new IntersectionObserver(e=>{vis=e[0].isIntersecting;kick()}).observe(hx);document.addEventListener("visibilitychange",kick);
 hx.addEventListener("pointermove",e=>{const r=hx.getBoundingClientRect();mt=[(e.clientX-r.left)/r.width,1-(e.clientY-r.top)/r.height]},{passive:true});
 hx.addEventListener("pointerleave",()=>{mt=[.5,.5]});
 addEventListener("deviceorientation",e=>{if(e.gamma==null||fine)return;const c=x=>Math.max(-1,Math.min(1,x));mt=[.5+c(e.gamma/35)*.45,.5-c((e.beta-55)/35)*.45]},{passive:true});
 cv.addEventListener("webglcontextlost",e=>{e.preventDefault();hx.classList.remove("gl");cv.remove()});
 new MutationObserver(sync).observe($("#hbgs"),{subtree:true,attributes:true,attributeFilter:["style","class"]});sync();
 window.__fx={draw:()=>A&&draw(performance.now()),state:()=>({ready:!!A,going,p})}}
if(hx&&!RM)try{heroGL()}catch(e){console.warn("[fx] hero off:",e)}

/* ---------- 2. 3D card tilt + glare (mouse only) ---------- */
if(fine&&!RM){
 const rst=k=>["--rx","--ry","--go","--sc"].forEach(p=>k.style.removeProperty(p));
 document.addEventListener("pointermove",e=>{const k=e.target.closest&&e.target.closest(".card:not(.sk)");if(!k)return;
  const r=k.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height,s=k.style;
  s.setProperty("--ry",((x-.5)*16).toFixed(2)+"deg");s.setProperty("--rx",((.5-y)*16).toFixed(2)+"deg");
  s.setProperty("--gx",(x*100).toFixed(1)+"%");s.setProperty("--gy",(y*100).toFixed(1)+"%");s.setProperty("--go",1);s.setProperty("--sc",1.06)},{passive:true});
 document.addEventListener("pointerout",e=>{const k=e.target.closest&&e.target.closest(".card");if(k&&!k.contains(e.relatedTarget))rst(k)});
 /* ---------- 3. cursor ---------- */
 const c=document.createElement("div");c.id="cur";document.body.append(c);let x=0,y=0,tx=0,ty=0,on=0;
 addEventListener("pointermove",e=>{tx=e.clientX;ty=e.clientY;if(!on){x=tx;y=ty;on=1;c.classList.add("on");document.body.classList.add("fxc")}
  const t=e.target.closest?e.target:null;c.classList.toggle("hot",!!(t&&t.closest("a,button,.card,.rh,select,[role=button]")))},{passive:true});
 (function f(){x+=(tx-x)*.2;y+=(ty-y)*.2;c.style.transform=`translate3d(${x}px,${y}px,0)`;requestAnimationFrame(f)})();
}

/* ---------- 4. circular reveal origin for the detail sheet ---------- */
addEventListener("pointerdown",e=>{root.style.setProperty("--cx",e.clientX+"px");root.style.setProperty("--cy",e.clientY+"px")},{capture:true,passive:true});

/* ---------- 5. scroll reveals for rows + detail backdrop parallax ---------- */
if(!RM){
 const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{rootMargin:"0px 0px -8% 0px"});
 const add=n=>{if(n.nodeType===1&&n.classList.contains("row")&&!n.classList.contains("rv")){n.classList.add("rv");io.observe(n)}};
 const rows=$("#rows");if(rows){rows.childNodes.forEach(add);new MutationObserver(l=>l.forEach(r=>r.addedNodes.forEach(add))).observe(rows,{childList:true})}
 const md=$("#modal");if(md)md.addEventListener("scroll",()=>{const t=md.querySelector(".tr");if(t)t.style.setProperty("--sy",Math.min(md.scrollTop,520)+"px")},{passive:true});
}
})();

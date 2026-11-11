/* ---------- animated scene behind the list (canvas) ---------- */
const Scene={cv:null,cx:null,kind:"none",P:[],M:[],B:[],raf:0,w:0,h:0,flash:0,k:1,target:1,
  V:1,D:1,weather:"none",W:[],fx:[],SP:[],bf:{},rit:1,clock:0,lt:0,drawn:false,lite:false,pos:()=>null,posC:new Map(),posT:0,
  init(){this.cv=$("#scene");this.cx=this.cv.getContext("2d");this.cv.hidden=false;this.cv2=$("#scene2");this.fv=$("#sceneFx");
    this.fxc=this.fv&&this.fv.getContext("2d");addEventListener("resize",()=>this.size());
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)this.loop()});this.size()},
  size(){if(!this.cx)return;this.w=this.cv.width=innerWidth;this.h=this.cv.height=innerHeight;if(this.fv){this.fv.width=this.w;
    this.fv.height=this.h}this.make();this.makeW();this.loop()},
  /* R6: with fade, the old scene stays for a moment as a picture and melts into the new one */
  set(k,fade){if(!this.cx||k===this.kind)return;
    if(fade&&!reduced&&this.drawn&&this.cv2){const c2=this.cv2,a=this.cv;c2.width=this.w;c2.height=this.h;const x2=c2.getContext("2d");
      x2.clearRect(0,0,this.w,this.h);x2.drawImage(a,0,0);
      c2.hidden=false;c2.style.transition=a.style.transition="none";c2.style.opacity=1;a.style.opacity=0;void c2.offsetWidth;
      c2.style.transition=a.style.transition="opacity 2.6s ease";c2.style.opacity=0;a.style.opacity=1;clearTimeout(this.fadeT);
        this.fadeT=setTimeout(()=>{c2.hidden=true;a.style.transition=""},2800)}
    this.kind=k;this.make();this.loop()},
  /* K3 density and speed, K1 weather over any scene or picture */
  opts(o){let ch=false;const D=Math.max(.3,Math.min(2,Number(o.D)||1)),V=Math.max(.3,Math.min(2.5,Number(o.V)||1));
    if(D!==this.D){this.D=D;this.make();this.makeW();ch=true}if(V!==this.V){this.V=V;ch=true}
    if(o.weather!==this.weather){this.weather=o.weather||"none";this.makeW();ch=true}if(ch)this.loop()},
  vNow(){return (this.V||1)*(this.bf.silence&&!this.bf.silence.off?.35:1)},
  active(){return this.kind!=="none"||this.weather!=="none"||this.fx.length>0||this.SP.length>0||Object.keys(this.bf).length>0},
  make(){
    const w=this.w,h=this.h,R=Math.random,n=a=>Math.max(1,Math.round(a*Math.min(1.5,Math.max(.5,(w*h)/(1280*800)))*this.D));this.P=[];this.M=[];this.B=[];
    switch(this.kind){
      case "fog":for(let i=0;i<n(10);i++)this.P.push({x:R()*w,y:R()*h,r:220+R()*340,vx:(R()-.5)*.3,vy:(R()-.5)*.08,a:.04+R()*.05});break;
      case "forest":for(let i=0;i<n(30);i++)this.P.push({x:R()*w,y:h*.25+R()*h*.75,vx:0,vy:0,ph:R()*6.28,sp:.6+R()*1.2});break;
      case "dungeon":for(let i=0;i<n(40);i++)this.P.push({x:R()*w,y:R()*h,vx:(R()-.5)*.12,vy:-(.03+R()*.1),r:.6+R()*1.4,a:.12+R()*.3});break;
      case "tavern":for(let i=0;i<n(55);i++)this.P.push({x:R()*w,y:R()*h,vx:(R()-.5)*.15,vy:-(.05+R()*.18),r:.7+R()*1.6,a:.15+R()*.35});break;
      case "storm":for(let i=0;i<n(180);i++)this.P.push({x:R()*w,y:R()*h,l:12+R()*24,v:10+R()*8});break;
      case "fire":for(let i=0;i<n(75);i++)this.P.push(this.ember(true));break;
      case "snow":for(let i=0;i<n(140);i++)this.P.push({x:R()*w,y:R()*h,r:.8+R()*2.4,v:.3+R()*.9,ph:R()*6.28});break;
      case "stars":for(let i=0;i<n(160);i++)this.P.push({x:R()*w,y:R()*h,r:.4+R()*1.5,ph:R()*6.28,sp:.5+R()*1.8,vx:.03+R()*.08});break;
      case "sand":for(let i=0;i<n(220);i++)this.P.push({x:R()*w,y:R()*h,l:2+R()*7,v:1.5+R()*3.5,a:.1+R()*.3,ph:R()*6.28});break;
      case "underdark":for(let i=0;i<n(70);i++)this.P.push({x:R()*w,y:R()*h,vy:-(.08+R()*.25),ph:R()*6.28,r:.8+R()*1.8,c:R()<.5?"120,240,230":"190,130,255"});
        for(let i=0;i<n(16);i++)this.M.push({x:R()*w,s:14+R()*38,c:R()<.5?"110,230,220":"180,120,255",ph:R()*6.28,y:h-R()*h*.04});break;
      case "underwater":for(let i=0;i<n(45);i++)this.P.push({x:R()*w,y:R()*h,r:1.5+R()*4,vy:-(.3+R()*.8),ph:R()*6.28});
        for(let i=0;i<6;i++)this.M.push({x:R()*w,wd:60+R()*130,ph:R()*6.28});break;
      case "ship":break;
      case "swamp":for(let i=0;i<n(22);i++)this.P.push({x:R()*w,y:h*.55+R()*h*.45,vx:0,vy:0,ph:R()*6.28,sp:.5+R()*1.1});
        for(let i=0;i<n(8);i++)this.M.push({x:R()*w,y:h*.82+R()*h*.2,r:200+R()*260,vx:(R()-.5)*.25});break;
      case "shadowfell":for(let i=0;i<n(9);i++)this.P.push({x:R()*w,y:R()*h,vx:(R()-.5)*.4,vy:(R()-.5)*.1,ph:R()*6.28,len:3+R()*5});
        for(let i=0;i<n(60);i++)this.M.push({x:R()*w,y:R()*h,v:.2+R()*.4,ph:R()*6.28,r:.6+R()*1.2});break;
      case "avernus":for(let i=0;i<n(55);i++)this.P.push(this.ember(true));
        for(let i=0;i<n(80);i++)this.M.push({x:R()*w,y:R()*h,v:.4+R()*.8,ph:R()*6.28,r:.8+R()*1.6});break;
      case "feywild":{const C=["255,170,200","255,210,170","210,180,255","180,240,210"];
        for(let i=0;i<n(40);i++)this.P.push({x:R()*w,y:R()*h,vx:.3+R()*.6,vy:.3+R()*.7,rot:R()*6.28,vr:(R()-.5)*.04,c:C[i%4],sz:4+R()*5});
        for(let i=0;i<n(50);i++)this.M.push({x:R()*w,y:R()*h,ph:R()*6.28,sp:.6+R()*1.6,c:C[(i+1)%4]});break}
      case "temple":for(let i=0;i<4;i++)this.M.push({x:w*(.06+i*.24)+R()*40,wd:70+R()*70,ph:R()*6.28});
        for(let i=0;i<n(60);i++)this.P.push({x:R()*w,y:R()*h,vx:(R()-.5)*.12,vy:(R()-.5)*.08,r:.6+R()*1.4,ph:R()*6.28});break;
      case "tower":for(let i=0;i<n(14);i++)this.P.push(this.rune(true));break;
      case "cityrain":for(let i=0;i<n(140);i++)this.P.push({x:R()*w,y:R()*h,l:10+R()*16,v:8+R()*6});
        this.M=[{x:w*.1,y:h*.34,ph:0},{x:w*.9,y:h*.28,ph:2}];break;
      case "astral":for(let i=0;i<n(90);i++)this.P.push({x:R()*w,y0:R()*h,amp:20+R()*60,f:.002+R()*.004,ph:R()*6.28,v:.3+R()*.9,r:.5+R()*1.3});
        {const C=["120,90,200","60,150,170","170,110,200","90,120,210"];for(let i=0;i<4;
          i++)this.M.push({x:R()*w,y:R()*h,r:w*(.25+R()*.25),c:C[i],vx:(R()-.5)*.05})}break;
      case "grave":for(let i=0;i<n(7);i++)this.P.push({x:R()*w,y:h*(.35+R()*.55),vx:(R()-.5)*.35,ph:R()*6.28,sp:.4+R()*.6});
        for(let i=0;i<n(9);i++)this.M.push({x:R()*w,y:h*(.82+R()*.22),r:180+R()*240,vx:(R()-.5)*.25});
        {const k=Math.max(4,Math.round(w/260));for(let i=0;i<k;i++)this.B.push({x:w*(i+.5)/k+(R()-.5)*w/k*.5,wd:42+R()*40,ht:80+R()*90,cross:R()<.35})}break;
      case "crystal":{const k=Math.max(5,Math.round(w/190));for(let i=0;i<k;i++){const up=i%3!==1;
        this.M.push({x:w*(i+.5)/k+(R()-.5)*w/k*.6,up,ht:(up?80:50)+R()*(up?h*.2:h*.12),wd:34+R()*44,hue:185+R()*110,lean:(R()-.5)*.35,ph:R()*6.28})}
        for(let i=0;i<n(16);i++)this.P.push({m:Math.floor(R()*k),ph:R()*6.28,sp:.4+R()*.9,f:.25+R()*.7});break}
      case "aurora":for(let i=0;i<3;i++)this.M.push({y:h*(.1+i*.09),amp:h*(.05+R()*.05),f:.0025+R()*.002,f2:.006+R()*.004,sp:.15+R()*.15,sp2:.1+R()*.1,len:
        h*(.22+R()*.14),c:i===1?"170,120,255":"90,255,170",ph:R()*6.28});
        for(let i=0;i<n(90);i++)this.P.push({x:R()*w,y:R()*h*.7,r:.6+R()*1.2,ph:R()*6.28,sp:.5+R()*1.5});break;
      case "autumn":{const C=["217,130,43","184,71,30","224,176,58","143,58,26","200,100,30"];
        for(let i=0;i<n(36);i++)this.P.push({x:R()*w,y:R()*h,vx:.2+R()*.5,vy:.5+R()*.8,rot:R()*6.28,vr:(R()-.5)*.06,c:C[i%5],sz:10+R()*9,ph:R()*6.28});break}
      case "meadow":for(let i=0;i<4;i++)this.M.push({x:w*(.02+i*.2)+R()*40,wd:60+R()*80,ph:R()*6.28});
        for(let i=0;i<n(45);i++)this.P.push({x:R()*w,y:R()*h,vx:(R()-.5)*.25,vy:-(.02+R()*.12),r:.8+R()*1.6,ph:R()*6.28});
        for(let i=0;i<3;i++)this.B.push({x:R()*w,y:h*(.3+R()*.5),vx:0,vy:0,ph:R()*6.28,c:["255,200,80","180,210,255","255,150,190"][i]});break;
      case "bloodmoon":this.M=[{x:w*.78,y:h*.18,r:Math.min(w,h)*.11}];
        for(let i=0;i<n(7);i++)this.P.push({x:R()*w,y:h*(.08+R()*.45),vx:(1+R()*1.6)*(R()<.5?-1:1),ph:R()*6.28,sz:8+R()*9,sp:9+R()*6});
        for(let i=0;i<4;i++)this.B.push({x:R()*w,y:h*(.1+R()*.25),wd:w*(.18+R()*.2),vx:.15+R()*.25});break;
      case "ritual":{const R0=Math.min(w,h)*.4;this.M=[{r:R0,n:16,dir:1,sp:.06},{r:R0*.76,n:12,dir:-1,sp:.09},{r:R0*.52,n:8,dir:1,sp:.13}].map(o=>
        Object.assign(o,{g:Array.from({length:o.n},()=>Array.from({length:2+Math.floor(R()*3)},()=>[R()*2-1,R()*2-1,R()*2-1,R()*2-1]))}));
        for(let i=0;i<n(30);i++)this.P.push({a:R()*6.28,r:R0*(.2+R()*.9),v:.002+R()*.004,ph:R()*6.28});this.rot=0;break}
      case "farrealm":for(let i=0;i<5;i++)this.M.push({x:R()*w,y:R()*h,r:Math.min(w,h)*(.25+R()*.3),vx:(R()-.5)*.3,vy:(R()-.5)*.2,c:i%2?"120,40,160":
        "40,140,90",ph:R()*6.28});
        for(let i=0;i<n(7);i++)this.P.push(this.eye(true));
        for(let i=0;i<6;i++)this.B.push({side:i%4,at:R(),len:.22+R()*.22,ph:R()*6.28});break;
      case "mechanus":{const U=Math.min(w,h);[[.08,.22,.2,14],[.27,.5,.13,10],[.5,.12,.24,18],[.74,.52,.17,12],[.93,.18,.12,9],[.4,.86,.15,11],[.85,.88,.2,
        15]].forEach(([x,y,r,t],i)=>this.M.push({x:x*w,y:y*h,r:r*U,t,dir:i%2?-1:1,ph:R()*6.28}));
        for(let i=0;i<n(40);i++)this.P.push({x:R()*w,y:R()*h,vx:(R()-.5)*.1,vy:(R()-.5)*.1,r:.6+R()*1.2});break}
      case "clouds":for(let i=0;i<n(14);i++)this.P.push(this.cloud(true));break;
      case "festival":for(let i=0;i<n(18);i++)this.P.push(this.lantern(true));break;
      case "battle":for(let i=0;i<n(10);i++)this.M.push({x:R()*w,y:h*(.4+R()*.7),r:160+R()*260,vx:-(.1+R()*.3),vy:-(.05+R()*.15),ph:R()*6.28});
        for(let i=0;i<n(45);i++)this.P.push(this.ember(true));
        for(let i=0;i<n(50);i++)this.B.push({x:R()*w,y:R()*h,v:.3+R()*.6,ph:R()*6.28,r:.8+R()*1.6});this.flash=0;break;
      case "mine":this.M=[{x:w*.3,len:h*.26,ph:0,amp:.18},{x:w*.72,len:h*.19,ph:1.7,amp:.24}];
        for(let i=0;i<n(70);i++)this.P.push({x:R()*w,y:R()*h,vx:(R()-.5)*.12,vy:(R()-.5)*.06+.02,r:.6+R()*1.4,ph:R()*6.28});break;
      case "ethereal":for(let i=0;i<n(5);i++)this.P.push(this.ghost(true));
        for(let i=0;i<n(60);i++)this.M.push({x:R()*w,y:R()*h,vx:(R()-.5)*.2,vy:-(.05+R()*.15),r:.6+R()*1.3,ph:R()*6.28});break;
      case "sewer":this.M=[{y:h*.84}];for(let i=0;i<n(6);i++)this.P.push({x:R()*w,y:h*(.6+R()*.3),r:120+R()*160,vy:-(.1+R()*.2),ph:R()*6.28});break;
    }
  },
  eye(any){const R=Math.random;return{x:R()*this.w,y:R()*this.h,s:10+R()*16,t:any?-R()*6:-1-R()*5,open:3+R()*4}},
  cloud(any){const R=Math.random,sc=.45+R()*1.1;return{x:any?R()*this.w:-300*sc,y:this.h*(.38+R()*.66),sc,v:(1+R()*1.2)*sc*1.6,b:Array.from({length:5+
    Math.floor(R()*4)},(_,i)=>[(i-3)*55+R()*30,(R()-.5)*34,60+R()*50])}},
  lantern(any){const R=Math.random;return{x:R()*this.w,y:any?R()*this.h:this.h+40,vy:-(.25+R()*.45),ph:R()*6.28,s:10+R()*10,hue:20+R()*30}},
  ghost(any){const R=Math.random,dir=R()<.5?1:-1;return{x:any?R()*this.w:dir>0?-220:this.w+220,y:this.h*(.15+R()*.65),dir,v:.35+R()*.5,s:40+R()*50,
    ph:R()*6.28}},
  /* K1: weather over any scene, or over your own picture */
  makeW(){const w=this.w,h=this.h,R=Math.random,n=a=>Math.max(1,Math.round(a*Math.min(1.5,Math.max(.5,(w*h)/(1280*800)))*this.D));this.W=[];
    if(this.weather==="rain")for(let i=0;i<n(160);i++)this.W.push({x:R()*w,y:R()*h,l:12+R()*20,v:9+R()*7});
    else if(this.weather==="snow")for(let i=0;i<n(130);i++)this.W.push({x:R()*w,y:R()*h,r:.8+R()*2.2,v:.4+R()*.9,ph:R()*6.28});
    else if(this.weather==="fog")for(let i=0;i<n(10);i++)this.W.push({x:R()*w,y:h*(.25+R()*.85),r:240+R()*320,vx:.08+R()*.25,a:.05+R()*.05});
    else if(this.weather==="ash")for(let i=0;i<n(90);i++)this.W.push({x:R()*w,y:R()*h,r:.8+R()*1.8,v:.3+R()*.6,ph:R()*6.28,ember:R()<.15})},
  drawW(s,V){const cx=this.cx,w=this.w,h=this.h,R=Math.random;
    if(this.weather==="rain"){cx.strokeStyle="rgba(175,195,230,.30)";cx.lineWidth=1;cx.beginPath();
      this.W.forEach(p=>{p.x+=p.v*.18*V;p.y+=p.v*V;if(p.y>h+30){p.y=-30;p.x=R()*w*1.2-w*.1}cx.moveTo(p.x,p.y);cx.lineTo(p.x-p.l*.18,p.y-p.l)});cx.stroke()}
    else if(this.weather==="snow"){cx.fillStyle="rgba(240,245,255,.78)";this.W.forEach(p=>{p.y+=p.v*V;p.x+=Math.sin(s*.8+p.ph)*.45*V;if(p.y>h+5){p.y=-5;
      p.x=R()*w}if(p.x<-5)p.x=w+5;if(p.x>w+5)p.x=-5;cx.beginPath();cx.arc(p.x,p.y,p.r,0,6.28);cx.fill()})}
    else if(this.weather==="fog")this.W.forEach(p=>{p.x+=p.vx*V;if(p.x>w+p.r)p.x=-p.r;this.glow(p.x,p.y,p.r,`rgba(195,202,218,${p.a*1.6})`)});
    else if(this.weather==="ash")this.W.forEach(p=>{p.y+=p.v*V;p.x+=(Math.sin(s*.6+p.ph)*.4-.2)*V;if(p.y>h+5){p.y=-5;p.x=R()*w}if(p.x<-5)p.x=w+5;
      if(p.ember){this.glow(p.x,p.y,p.r*4,"rgba(255,120,40,.18)");cx.fillStyle="rgba(255,170,90,.8)"}else cx.fillStyle="rgba(140,135,130,.55)";
        cx.fillRect(p.x,p.y,p.r,p.r)})},
  /* where a creature's row is on screen (null when it has none) */
  at(id){const now=performance.now();if(now-this.posT>400){this.posC.clear();this.posT=now}if(!this.posC.has(id))this.posC.set(id,this.pos(id));
    return this.posC.get(id)},
  /* R1: battlefield spells that last; L = [{key, tg:[ids], by:id}] */
  field(L){const now=performance.now(),seen=new Set();if(this.lite||reduced)L=[];
    L.forEach(e=>{seen.add(e.key);const b=this.bf[e.key];if(!b||b.off){const a0=b&&b.off?Math.max(0,1-(now-b.off)/1500):0;
      this.bf[e.key]={p:b?b.p:this.bfMake(e.key),on:now-a0*1500,off:null,until:0,tg:e.tg,by:e.by}}else{b.tg=e.tg;b.by=e.by;b.until=0}});
    let ch=false;for(const k in this.bf){const b=this.bf[k];if(!seen.has(k)&&!b.off&&!b.until){b.off=now;ch=true}}if(ch||L.length)this.loop()},
  /* the same, for a few seconds: a battlefield spell cast from a phone or the Hit-several box */
  fieldBurst(key,tg,by){if(this.lite||reduced)return;const now=performance.now(),b=this.bf[key];if(b&&!b.off&&!b.until)return;
    this.bf[key]={p:b?b.p:this.bfMake(key),on:now,off:null,until:now+7000,tg:tg||[],by};this.loop()},
  bfMake(k){const w=this.w,h=this.h,R=Math.random,P=[],n=a=>Math.round(a*Math.min(1.5,Math.max(.5,(w*h)/(1280*800))));
    if(k==="darkness")for(let i=0;i<8;i++)P.push({x:R()*w,y:R()*h,r:250+R()*300,vx:(R()-.5)*.3});
    else if(k==="fog"||k==="stink"||k==="kill")for(let i=0;i<n(14);i++)P.push({x:R()*w,y:R()*h,r:220+R()*300,vx:(R()-.5)*(k==="kill"?.7:.3),vy:(R()-.5)*.15});
    else if(k==="hadar"){for(let i=0;i<n(50);i++)P.push({a:R()*6.28,r:.15+R()*.4,v:.002+R()*.004,ph:R()*6.28});for(let i=0;i<8;
      i++)P.push({t:1,a:i/8*6.28+R()*.4,ph:R()*6.28,len:.3+R()*.25})}
    else if(k==="wallfire")for(let i=0;i<n(50);i++)P.push(this.ember(true));
    else if(k==="sleet")for(let i=0;i<n(170);i++)P.push({x:R()*w,y:R()*h,l:8+R()*14,v:11+R()*7});
    else if(k==="hail")for(let i=0;i<n(90);i++)P.push({x:R()*w,y:R()*h,r:1.5+R()*2.5,v:9+R()*8});
    else if(k==="guard")for(let i=0;i<14;i++)P.push({a:i/14*6.28,ph:R()*6.28,v:.012+R()*.008});
    else if(k==="day")for(let i=0;i<5;i++)P.push({x:w*(.05+i*.2)+R()*40,wd:70+R()*90,ph:R()*6.28});
    return P},
  drawBF(s,now,V){const cx=this.cx,BF_SOFT=new Set(["darkness","fog","stink","kill","hadar","day","silence","sleet"]),w=this.w,h=this.h,R=Math.random;
    for(const k in this.bf){const b=this.bf[k];if(b.until&&now>b.until&&!b.off)b.off=now;
      const a=b.off?1-(now-b.off)/1500:Math.min(1,(now-b.on)/1500);if(a<=0){delete this.bf[k];continue}const P=b.p;
        cx.globalAlpha=BF_SOFT.has(k)?.55:1;   // over the order, so the names stay readable
      switch(k){
        case "darkness":cx.fillStyle=`rgba(0,0,3,${.5*a})`;cx.fillRect(0,0,w,h);P.forEach(p=>{p.x+=p.vx*V;if(p.x<-p.r)p.x=w+p.r;if(p.x>w+p.r)p.x=-p.r;
          this.glow(p.x,p.y,p.r,`rgba(0,0,0,${.4*a})`)});break;
        case "fog":P.forEach(p=>{p.x+=p.vx*V;p.y+=p.vy*V;if(p.x<-p.r)p.x=w+p.r;if(p.x>w+p.r)p.x=-p.r;this.glow(p.x,p.y,p.r,`rgba(205,210,222,${.2*a})`)});break;
        case "stink":case "kill":{const c=k==="kill"?"110,200,90":"190,200,70";cx.fillStyle=`rgba(${c},${.06*a})`;cx.fillRect(0,0,w,h);
          P.forEach(p=>{p.x+=p.vx*V;p.y+=p.vy*V;if(p.x<-p.r)p.x=w+p.r;if(p.x>w+p.r)p.x=-p.r;if(p.y<-p.r)p.y=h+p.r;if(p.y>h+p.r)p.y=-p.r;
            this.glow(p.x,p.y,p.r,`rgba(${c},${.16*a})`)});break}
        case "hadar":{const o=b.by&&this.at(b.by),x0=w/2,y0=h/2,U=Math.min(w,h);cx.fillStyle=`rgba(4,0,10,${.6*a})`;cx.fillRect(0,0,w,h);
          this.glow(x0,y0,U*.55,`rgba(0,0,0,${.75*a})`);
          P.forEach(p=>{if(p.t){const L=U*p.len;cx.strokeStyle=`rgba(110,40,140,${.6*a})`;cx.lineWidth=7;cx.beginPath();
            const ex=x0+Math.cos(p.a)*U*.75,ey=y0+Math.sin(p.a)*U*.75;cx.moveTo(ex,ey);
              for(let j=1;j<=10;j++){const q=j/10,wob=Math.sin(s*1.4+p.ph+q*6)*30*q;
                cx.lineTo(ex+(x0-ex)*q*p.len*1.6+Math.cos(p.a+1.57)*wob,ey+(y0-ey)*q*p.len*1.6+Math.sin(p.a+1.57)*wob)}cx.stroke();return}
            p.a+=p.v*V;const x=x0+Math.cos(p.a)*U*p.r,y=y0+Math.sin(p.a)*U*p.r;cx.fillStyle=`rgba(190,140,255,${(.3+.5*Math.abs(Math.sin(s*2+p.ph)))*a})`;
              cx.fillRect(x,y,1.6,1.6)});break}
        case "wallfire":{const f=.8+.2*Math.sin(s*5);for(let x=0;x<w+40;x+=34){const fl=h*.17*(.55+.3*Math.sin(s*6+x*.05)+.15*Math.sin(s*11+x*.13));
          this.glow(x,h,fl*1.3,`rgba(255,${120+40*Math.sin(x)},40,${.42*a*f})`);this.glow(x,h,fl*.5,`rgba(255,220,120,${.35*a*f})`)}
          P.forEach((p,i)=>{p.life+=V;p.y+=p.vy*1.6*V;p.x+=Math.sin(s*2+p.ph)*.6*V;const q=Math.max(0,1-p.life/p.max);
            if(q<=0||p.y<h*.45){P[i]=this.ember(false);return}
            this.glow(p.x,p.y,p.r*5,`rgba(255,${p.g|0},60,${.2*q*a})`);cx.fillStyle=`rgba(255,${(p.g+40)|0},120,${.9*q*a})`;
              cx.fillRect(p.x-1,p.y-1,2.4,2.4)});break}
        case "sleet":cx.fillStyle=`rgba(180,210,240,${.08*a})`;cx.fillRect(0,0,w,h);cx.strokeStyle=`rgba(225,240,255,${.4*a})`;cx.lineWidth=1.4;cx.beginPath();
          P.forEach(p=>{p.x+=p.v*.45*V;p.y+=p.v*V;if(p.y>h+20){p.y=-20;p.x=R()*w*1.3-w*.3}cx.moveTo(p.x,p.y);cx.lineTo(p.x-p.l*.45,p.y-p.l)});cx.stroke();break;
        case "hail":cx.fillStyle=`rgba(235,245,255,${.8*a})`;P.forEach(p=>{p.y+=p.v*V;p.x+=p.v*.1*V;
          if(p.y>h){if(R()<.3)this.burst(p.x,h-4,3,{c:"230,240,255",v:2,g:.15,life:20,r:1.2});p.y=-10;p.x=R()*w}cx.beginPath();cx.arc(p.x,p.y,p.r,0,6.28);
          cx.fill()});break;
        case "faerie":(b.tg||[]).forEach(id=>{const r=this.at(id);if(!r)return;if(R()<.5*V){const side=R();
          const x=side<.5?r.x+(R()-.5)*r.w:r.x+(R()<.5?-1:1)*r.w/2,y=side<.5?r.y+(R()<.5?-1:1)*r.h/2:r.y+(R()-.5)*r.h;
            this.burst(x,y,1,{c:["200,140,255","140,190,255","170,255,190"][Math.floor(R()*3)],v:.4,g:-.01,life:50,r:1.6})}
          this.cx.save();this.cx.globalAlpha=.5*a*(.7+.3*Math.sin(s*3));this.halo(r,"190,130,255",18);this.cx.restore()});break;
        case "guard":{const r=b.by&&this.at(b.by);if(!r)break;P.forEach(p=>{p.a+=p.v*V;
          const rx=r.w*.62,ry=Math.max(r.h*1.4,60),x=r.x+Math.cos(p.a)*rx,y=r.y+Math.sin(p.a)*ry;
          this.glow(x,y,26,`rgba(255,220,130,${.45*a})`);cx.fillStyle=`rgba(255,245,210,${.9*a})`;cx.beginPath();cx.arc(x,y,3.4,0,6.28);cx.fill()});break}
        case "day":cx.fillStyle=`rgba(255,244,215,${.16*a})`;cx.fillRect(0,0,w,h);P.forEach(r=>{const g=cx.createLinearGradient(0,0,0,h);
          g.addColorStop(0,`rgba(255,245,210,${.18*a*(.8+.2*Math.sin(s*.5+r.ph))})`);g.addColorStop(1,"rgba(255,245,210,0)");
          cx.fillStyle=g;cx.beginPath();cx.moveTo(r.x,-20);cx.lineTo(r.x+r.wd,-20);cx.lineTo(r.x+r.wd*1.6+h*.3,h);cx.lineTo(r.x+h*.3,h);cx.closePath();
            cx.fill()});break;
        case "silence":{cx.fillStyle=`rgba(140,150,175,${.12*a})`;cx.fillRect(0,0,w,h);const U=Math.min(w,h),pr=.5+.5*Math.sin(s*.6);
          cx.strokeStyle=`rgba(200,210,235,${.18*a})`;cx.lineWidth=2;
          for(let i=0;i<3;i++){cx.beginPath();cx.arc(w/2,h/2,U*(.3+i*.12+pr*.03),0,6.28);cx.stroke()}break}
      }}},
  /* sparks and the like that fly for a moment */
  burst(x,y,n,o){for(let i=0;i<n&&this.SP.length<400;i++){const an=o.an!=null?o.an+(Math.random()-.5)*(o.spread||6.28):Math.random()*6.28,v=(o.v||2)*(.4+
    Math.random()*.8);
    this.SP.push({x:x+(Math.random()-.5)*(o.jx||0),y:y+(Math.random()-.5)*(o.jy||0),vx:Math.cos(an)*v+(o.vx||0),vy:Math.sin(an)*v+(o.vy||0),g:o.g||0,life:0,max:
      (o.life||60)*(.6+Math.random()*.6),r:(o.r||2)*(.6+Math.random()*.8),c:o.c||"255,200,120",soft:o.soft})}},
  drawSP(V){const cx=this.cx;this.SP=this.SP.filter(p=>{p.life+=V;const a=1-p.life/p.max;if(a<=0)return false;p.vy+=p.g*V;p.vx*=.985;p.vy*=.985;p.x+=p.vx*V;
    p.y+=p.vy*V;
    if(p.soft)this.glow(p.x,p.y,p.r,`rgba(${p.c},${.22*a})`);else{this.glow(p.x,p.y,p.r*4,`rgba(${p.c},${.25*a})`);
      cx.fillStyle=`rgba(${p.c},${Math.min(1,1.3*a)})`;cx.fillRect(p.x-p.r/2,p.y-p.r/2,p.r,p.r)}return true})},
  halo(r,c,blur){const cx=this.cx,rad=Math.min(r.h/2,18);cx.save();cx.shadowColor=`rgba(${c},.95)`;cx.shadowBlur=blur;cx.strokeStyle=`rgba(${c},.9)`;
    cx.lineWidth=3;
    cx.beginPath();if(cx.roundRect)cx.roundRect(r.x-r.w/2,r.y-r.h/2,r.w,r.h,rad);else cx.rect(r.x-r.w/2,r.y-r.h/2,r.w,r.h);cx.stroke();cx.restore()},
  /* a short effect: {k, t0, dur, …} */
  add(o,delay){if(this.lite||reduced)return;o.t0=performance.now()+(delay||0);this.fx.push(o);this.loop()},
  jolt(k){if(this.lite||reduced)return;const c="sjolt"+(k||"");document.body.classList.remove("sjolt","sjolt2","sjolt3");void document.body.offsetWidth;
    document.body.classList.add(c);clearTimeout(this.joltT);this.joltT=setTimeout(()=>document.body.classList.remove(c),1300)},
  tint(c,ms){if(this.lite||reduced)return;document.body.classList.add(c);clearTimeout((this.tintT||(this.tintT={}))[c]);
    this.tintT[c]=setTimeout(()=>document.body.classList.remove(c),ms)},
  drawFx(now){const cx=this.cx,w=this.w,h=this.h,R=Math.random,U=Math.min(w,h);
    const later=[];this.fx=this.fx.filter(f=>{const e=now-f.t0;if(e<0)return true;const q=e/f.dur;if(q>=1){if(f.done){later.push(f.done);
      f.done=null}return false}
      switch(f.k){
        case "flash":cx.fillStyle=`rgba(${f.c},${f.a*Math.pow(1-q,2)})`;cx.fillRect(0,0,w,h);break;
        case "vig":{const a=f.a*Math.pow(Math.sin(Math.PI*q*(f.n||1)),2),v=cx.createRadialGradient(w/2,h/2,U*.25,w/2,h/2,Math.max(w,h)*.75);
          v.addColorStop(0,`rgba(${f.c},0)`);v.addColorStop(1,`rgba(${f.c},${a})`);cx.fillStyle=v;cx.fillRect(0,0,w,h);break}
        case "frost":{const a=f.a*Math.min(1,q*4)*(1-q),v=cx.createRadialGradient(w/2,h/2,U*.3,w/2,h/2,Math.max(w,h)*.72);
          v.addColorStop(0,"rgba(200,230,255,0)");v.addColorStop(1,`rgba(215,238,255,${a})`);cx.fillStyle=v;cx.fillRect(0,0,w,h);
          if(!f.L){f.L=[];for(let i=0;i<46;i++){const ed=i%4,t=R(),x=ed===0?t*w:ed===1?w:ed===2?t*w:0,y=ed===0?0:ed===1?t*h:ed===2?h:t*h,an=Math.atan2(h/2-y,
            w/2-x)+(R()-.5)*.9,l=30+R()*90;f.L.push([x,y,an,l])}}
          cx.strokeStyle=`rgba(235,248,255,${a*1.2})`;cx.lineWidth=1.3;cx.beginPath();
            f.L.forEach(([x,y,an,l])=>{const L=l*Math.min(1,q*3),x2=x+Math.cos(an)*L,y2=y+Math.sin(an)*L;cx.moveTo(x,y);cx.lineTo(x2,y2);
            cx.moveTo(x+Math.cos(an)*L*.5,y+Math.sin(an)*L*.5);cx.lineTo(x+Math.cos(an)*L*.5+Math.cos(an+.7)*L*.3,y+Math.sin(an)*L*.5+Math.sin(an+.7)*L*.3);
              cx.moveTo(x+Math.cos(an)*L*.5,y+Math.sin(an)*L*.5);cx.lineTo(x+Math.cos(an)*L*.5+Math.cos(an-.7)*L*.3,y+Math.sin(an)*L*.5+Math.sin(an-.7)*L*.3)});
              cx.stroke();break}
        case "bolt":{if(!f.P||now-f.pt>70){f.pt=now;const A=f.A,B=f.B,n=14,P=[[A.x,A.y]],dx=B.x-A.x,dy=B.y-A.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
          for(let i=1;i<n;i++){const t=i/n,o=(R()-.5)*len*.12;P.push([A.x+dx*t+nx*o,A.y+dy*t+ny*o])}P.push([B.x,B.y]);f.P=P}
          const a=(1-q)*(.6+.4*R());[[10,`rgba(140,170,255,${.3*a})`],[3,`rgba(245,250,255,${a})`]].forEach(([lw,c])=>{cx.strokeStyle=c;cx.lineWidth=lw;
            cx.beginPath();f.P.forEach(([x,y],i)=>i?cx.lineTo(x,y):cx.moveTo(x,y));cx.stroke()});this.glow(f.B.x,f.B.y,60,`rgba(200,220,255,${.5*a})`);break}
        case "ring":{const r=f.R*(1-Math.pow(1-q,3)),a=1-q;cx.strokeStyle=`rgba(${f.c},${.75*a})`;cx.lineWidth=f.lw*(1-q*.6);cx.beginPath();
          cx.arc(f.x,f.y,r,0,6.28);cx.stroke();if(f.fill)this.glow(f.x,f.y,r,`rgba(${f.c},${.25*a})`);break}
        case "boom":{const r=f.R*(1-Math.pow(1-q,2.5)),a=Math.pow(1-q,1.4);this.glow(f.x,f.y,r*1.25,`rgba(255,150,50,${.55*a})`);
          this.glow(f.x,f.y,r*.6,`rgba(255,235,170,${.75*a})`);break}
        case "rays":(f.P||[]).forEach(p=>{const a=f.a*Math.sin(Math.PI*q),g=cx.createLinearGradient(0,0,0,p.y);g.addColorStop(0,`rgba(${f.c},0)`);
          g.addColorStop(1,`rgba(${f.c},${a})`);cx.fillStyle=g;
          cx.beginPath();cx.moveTo(p.x-40,-10);cx.lineTo(p.x+40,-10);cx.lineTo(p.x+Math.min(p.w||120,260)*.5,p.y);cx.lineTo(p.x-Math.min(p.w||120,260)*.5,p.y);
            cx.closePath();cx.fill();this.glow(p.x,p.y,90,`rgba(${f.c},${a*.8})`)});break;
        case "bead":{const t=Math.pow(q,1.6),x=f.A.x+(f.B.x-f.A.x)*t,y=f.A.y+(f.B.y-f.A.y)*t-Math.sin(Math.PI*t)*U*(f.arc||.12);
          this.glow(x,y,f.r*5,`rgba(${f.c},.5)`);cx.fillStyle=`rgba(255,250,230,.95)`;cx.beginPath();cx.arc(x,y,f.r,0,6.28);cx.fill();
          if(R()<.8)this.burst(x,y,1,{c:f.c,v:.5,life:22,r:2});break}
        case "beam":{const a=Math.sin(Math.PI*Math.min(1,q*1.4));[[f.wd*2.4,`rgba(${f.c},${.25*a})`],[f.wd,`rgba(${f.c},${.85*a})`],[f.wd*.3,
          `rgba(255,255,240,${a})`]].forEach(([lw,c])=>{cx.strokeStyle=c;cx.lineWidth=lw;cx.beginPath();cx.moveTo(f.A.x,f.A.y);cx.lineTo(f.B.x,f.B.y);
          cx.stroke()});break}
        case "cone":{const an=Math.atan2(f.B.y-f.A.y,f.B.x-f.A.x),L=Math.hypot(f.B.x-f.A.x,f.B.y-f.A.y)*1.35*Math.min(1,q*3),a=f.a*(1-q),
          g=cx.createRadialGradient(f.A.x,f.A.y,0,f.A.x,f.A.y,Math.max(1,L));g.addColorStop(0,`rgba(${f.c},${a})`);g.addColorStop(1,`rgba(${f.c},0)`);
          cx.fillStyle=g;cx.beginPath();cx.moveTo(f.A.x,f.A.y);cx.arc(f.A.x,f.A.y,Math.max(1,L),an-.45,an+.45);cx.closePath();cx.fill();break}
        case "dark":cx.fillStyle=`rgba(0,0,0,${f.a*Math.sin(Math.PI*q)})`;cx.fillRect(0,0,w,h);break;
        case "wave":{const n=f.P.length;f.P.forEach((p,i)=>{const t=Math.min(1,Math.max(0,q*1.6-i/n*.6));if(t<=0||t>=1)return;
          const x=p.A.x+(p.B.x-p.A.x)*t+p.j*Math.sin(t*9),y=p.A.y+(p.B.y-p.A.y)*t-Math.sin(Math.PI*t)*p.arc;
            this.glow(x,y,f.bane?26:18,`rgba(${f.c},${f.bane?.32:.4})`);if(!f.bane){cx.fillStyle="rgba(255,250,225,.9)";cx.fillRect(x-1.2,y-1.2,2.4,2.4)}});
          if(q>.62)(f.R||[]).forEach(r=>{cx.save();cx.globalAlpha=Math.sin(Math.PI*(q-.62)/.38);this.halo(r,f.c,f.bane?26:22);cx.restore()});break}
        case "halo":{cx.save();cx.globalAlpha=Math.sin(Math.PI*q);this.halo(f.r,f.c,22);cx.restore();break}
      }
      return true});later.forEach(d=>d())},
  /* R1: a spell or a breath weapon, by name or by its damage type; A = where it comes from, T = the rows it lands on */
  spell(name,type,A,T,o){if(this.lite||reduced)return;o=o||{};const w=this.w,h=this.h,U=Math.min(w,h),R=Math.random,n=String(name||"").toLowerCase().trim();
    T=(T||[]).filter(Boolean);if(!T.length)T=[{x:w/2,y:h*.45,w:w*.4,h:60}];A=A||{x:w/2,y:h+30};
    const C={x:T.reduce((a,p)=>a+p.x,0)/T.length,y:T.reduce((a,p)=>a+p.y,0)/T.length};
    const boom=(p,big)=>{this.add({k:"boom",x:p.x,y:p.y,R:U*(big?.42:.3),dur:1100});
      this.add({k:"ring",x:p.x,y:p.y,R:U*(big?.5:.36),c:"255,170,80",lw:16,dur:900});this.add({k:"flash",c:"255,170,90",a:big?.5:.38,dur:700});
      this.burst(p.x,p.y,big?90:60,{c:"255,170,70",v:6,g:.06,life:70,r:2.6});this.jolt(big?"3":"2")};
    const bf=BF_FX[n];if(bf){this.fieldBurst(bf,o.tg||[],o.by);return}
    switch(n){
      case "fireball":this.add({k:"bead",A,B:C,r:6,c:"255,170,80",dur:650,done:()=>boom(C,true)});return;
      case "lightning bolt":{const dx=C.x-A.x,dy=C.y-A.y,l=Math.hypot(dx,dy)||1,B={x:A.x+dx/l*Math.max(w,h)*1.3,y:A.y+dy/l*Math.max(w,h)*1.3};
        this.add({k:"bolt",A,B,dur:650});this.add({k:"flash",c:"215,228,255",a:.45,dur:500});this.jolt("");
        T.forEach(p=>this.burst(p.x,p.y,16,{c:"200,220,255",v:4,life:30,r:1.6}));return}
      case "call lightning":T.forEach((p,i)=>{this.add({k:"bolt",A:{x:p.x+(R()-.5)*160,y:-20},B:p,dur:600},i*120);
        this.add({k:"ring",x:p.x,y:p.y,R:U*.2,c:"200,215,255",lw:6,dur:700},i*120)});this.add({k:"flash",c:"220,230,255",a:.5,dur:600});this.jolt("2");return;
      case "cone of cold":this.add({k:"cone",A,B:C,c:"210,235,255",a:.7,dur:1300});this.add({k:"frost",a:.6,dur:3200});
        T.forEach(p=>this.burst(p.x,p.y,24,{c:"220,240,255",v:2,g:.03,life:70,r:2}));return;
      case "thunderwave":this.add({k:"ring",x:A.x,y:A.y,R:U*.55,c:"210,220,255",lw:16,dur:800});
        this.add({k:"ring",x:A.x,y:A.y,R:U*.75,c:"210,220,255",lw:8,dur:1000},140);this.jolt("3");return;
      case "shatter":this.add({k:"ring",x:C.x,y:C.y,R:U*.3,c:"230,230,245",lw:10,dur:700});this.burst(C.x,C.y,50,{c:"235,240,255",v:7,g:.18,life:55,r:2.2});
        this.add({k:"flash",c:"240,240,255",a:.3,dur:400});this.jolt("3");return;
      case "meteor swarm":for(let i=0;i<4;i++){const p=T[i%T.length],B={x:p.x+(i>=T.length?(R()-.5)*U*.5:0),y:p.y+(i>=T.length?(R()-.5)*U*.3:0)};
        this.add({k:"bead",A:{x:w+80,y:-80-i*40},B,r:9,arc:0,c:"255,140,60",dur:700,done:()=>boom(B,i===0)},i*320)}return;
      case "disintegrate":{const B=T[0];this.add({k:"beam",A,B,c:"120,255,110",wd:9,dur:800});this.add({k:"flash",c:"150,255,140",a:.18,dur:500},300);
        setTimeout(()=>this.burst(B.x,B.y,60,{c:"150,150,140",v:1.5,g:.06,life:80,r:2,jx:B.w*.6,jy:B.h*.5}),550);return}
      case "power word kill":{const B=T[0];this.add({k:"dark",a:.7,dur:1300});this.add({k:"ring",x:B.x,y:B.y,R:U*.25,c:"255,255,255",lw:2,dur:700},450);
        this.add({k:"halo",r:B,c:"255,255,255",dur:900},400);return}
      case "mass healing word":case "mass cure wounds":case "healing word":case "cure wounds":case "prayer of healing":case "heal":case "mass heal":
        T.forEach(p=>{this.burst(p.x,p.y+p.h*.3,26,{c:R()<.5?"140,255,170":"255,230,140",v:.9,an:-1.57,spread:1.2,g:-.02,life:90,r:2.2,jx:p.w*.8});
          this.add({k:"halo",r:p,c:"150,255,180",dur:1400})});this.add({k:"vig",c:"120,255,160",a:.18,dur:1600});return;
    }
    const t=String(type||"").toLowerCase();
    switch(t){
      case "fire":this.add({k:"vig",c:"255,90,20",a:.35,dur:1400});T.forEach(p=>this.burst(p.x,p.y,30,{c:"255,160,60",v:3,an:-1.57,spread:2.2,g:-.03,life:60,r:
        2.4,jx:p.w*.7}));break;
      case "cold":this.add({k:"frost",a:.55,dur:3000});T.forEach(p=>this.burst(p.x,p.y,18,{c:"225,242,255",v:1.4,g:.02,life:80,r:1.8,jx:p.w*.7}));break;
      case "lightning":T.forEach((p,i)=>this.add({k:"bolt",A:{x:p.x+(R()-.5)*240,y:-20},B:p,dur:500},i*90));this.add({k:"flash",c:"215,228,255",a:.4,dur:450});
        this.jolt("");break;
      case "thunder":T.forEach((p,i)=>{this.add({k:"ring",x:p.x,y:p.y,R:U*.3,c:"200,210,255",lw:7,dur:800},i*80);
        this.add({k:"ring",x:p.x,y:p.y,R:U*.42,c:"200,210,255",lw:3,dur:1000},150+i*80)});this.jolt("3");break;
      case "necrotic":this.tint("sdrain",1800);this.add({k:"vig",c:"40,0,60",a:.5,dur:1800});
        T.forEach(p=>this.burst(p.x,p.y,20,{c:"120,60,140",v:.8,an:-1.57,spread:1.5,g:-.02,life:80,r:3,soft:false,jx:p.w*.6}));break;
      case "radiant":this.add({k:"rays",P:T,c:"255,228,150",a:.45,dur:1500});this.add({k:"flash",c:"255,240,190",a:.22,dur:700});
        T.forEach(p=>this.burst(p.x,p.y,18,{c:"255,235,160",v:2,life:50,r:1.8,jx:p.w*.5}));break;
      case "acid":case "poison":{const c=t==="acid"?"170,235,40":"120,200,70";
        T.forEach(p=>{this.burst(p.x,p.y,10,{c,v:.5,an:-1.57,spread:2,g:-.008,life:110,r:70,soft:true,jx:p.w*.6});
        this.burst(p.x,p.y,12,{c,v:1.5,g:.12,life:40,r:2})});break}
      case "psychic":this.tint("spsy",1700);T.forEach((p,i)=>{this.add({k:"ring",x:p.x,y:p.y,R:U*.22,c:"255,120,220",lw:4,dur:900},i*60);
        this.add({k:"ring",x:p.x,y:p.y,R:U*.3,c:"200,120,255",lw:2,dur:1100},250+i*60)});break;
      case "force":this.add({k:"ring",x:C.x,y:C.y,R:U*.6,c:"170,190,255",lw:12,fill:true,dur:900});this.jolt("2");break;
      default:return false;
    }return true},
  /* R1: Bless and Bane, from the caster to the rows they touch */
  wave(A,T,bane){if(this.lite||reduced||!T.length)return;const R=Math.random,P=[];A=A||{x:this.w/2,y:this.h+30};
    T.forEach(B=>{for(let i=0;i<14;i++)P.push({A,B,j:(R()-.5)*30,arc:60+R()*90})});
    this.add({k:"wave",P,R:T,bane,c:bane?"40,40,55":"255,215,110",dur:1700})},
  crit(){this.add({k:"flash",c:"255,226,140",a:.5,dur:700});this.add({k:"vig",c:"255,200,90",a:.35,dur:1200});this.jolt("2")},
  lair(){this.add({k:"vig",c:"220,25,25",a:.5,n:2,dur:2600});this.jolt("3")},
  loop(){
    cancelAnimationFrame(this.raf);if(!this.cx)return;
    if(!this.active()){this.cx.clearRect(0,0,this.w,this.h);if(this.fxc)this.fxc.clearRect(0,0,this.w,this.h);this.drawn=false;return}
    if(reduced){this.draw(0);this.drawn=true;return}
    const step=t=>{if(document.hidden)return;if(!this.active()){this.cx.clearRect(0,0,this.w,this.h);if(this.fxc)this.fxc.clearRect(0,0,this.w,this.h);
      this.drawn=false;return}
      const dt=this.lt?Math.max(0,Math.min(.1,(t-this.lt)/1000)):0;this.lt=t;this.clock+=dt*this.vNow();
      this.k+=(this.target-this.k)*.02;this.draw(t);this.drawn=true;this.raf=requestAnimationFrame(step)};
    this.raf=requestAnimationFrame(step);
  },
  rune(any){const R=Math.random,k=3+Math.floor(R()*3),L=[];for(let i=0;i<k;i++)L.push([R()*6.28,R()*6.28]);
    return{x:R()*this.w,y:any?R()*this.h:this.h+40,vy:-(.1+R()*.2),life:any?R()*500:0,max:500+R()*400,s:14+R()*22,L,rot:R()*6.28,vr:(R()-.5)*.004,tri:R()<.5}},
  ember(any){const R=Math.random;return{x:R()*this.w,y:any?R()*this.h:this.h+10,vy:-(.6+R()*1.5),ph:R()*6.28,r:1+R()*2.2,life:any?R()*200:0,max:220+R()*280,g:
    150+R()*90}},

  glow(x,y,r,col){const g=this.cx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,"rgba(0,0,0,0)");this.cx.fillStyle=g;
    this.cx.fillRect(x-r,y-r,r*2,r*2)},
  draw(t){
    const cx=this.cx,w=this.w,h=this.h,s=this.clock,R=Math.random,K=this.k||1,V=this.vNow(),M=K*V;cx.clearRect(0,0,w,h);
    const lin=(stops)=>{const g=cx.createLinearGradient(0,0,0,h);stops.forEach(([o,c])=>g.addColorStop(o,c));cx.fillStyle=g;cx.fillRect(0,0,w,h)};
    const wrap=(p,m)=>{if(p.x<-m)p.x=w+m;if(p.x>w+m)p.x=-m;if(p.y<-m)p.y=h+m;if(p.y>h+m)p.y=-m};
    switch(this.kind){
      case "fog":{
        const g=cx.createLinearGradient(0,0,0,h);g.addColorStop(0,"rgba(60,70,90,.10)");g.addColorStop(1,"rgba(120,130,150,.18)");cx.fillStyle=g;
          cx.fillRect(0,0,w,h);
        this.P.forEach(p=>{p.x+=(p.vx*K)*V;p.y+=(p.vy)*V;wrap(p,p.r);this.glow(p.x,p.y,p.r,`rgba(190,198,215,${Math.min(.2,p.a*(.7+.3*K))})`)});break}
      case "forest":{
        const g=cx.createLinearGradient(0,0,0,h);g.addColorStop(0,"rgba(10,30,20,0)");g.addColorStop(1,"rgba(30,70,40,.32)");cx.fillStyle=g;
          cx.fillRect(0,0,w,h);
        this.P.forEach(p=>{p.vx=Math.max(-.6,Math.min(.6,p.vx+(R()-.5)*.06));p.vy=Math.max(-.4,Math.min(.4,p.vy+(R()-.5)*.05));p.x+=(p.vx)*V;
          p.y+=(p.vy)*V;wrap(p,10);
          const a=Math.max(0,Math.sin(s*p.sp+p.ph));this.glow(p.x,p.y,14,`rgba(200,240,110,${.35*a})`);cx.fillStyle=`rgba(235,255,170,${.9*a})`;
            cx.fillRect(p.x-1,p.y-1,2.2,2.2)});break}
      case "dungeon":{
        const f1=.75+.15*Math.sin(s*7.3)+.1*Math.sin(s*13.1+1)+R()*.05,f2=.75+.15*Math.sin(s*6.1+2)+.1*Math.sin(s*11.7)+R()*.05;
        this.glow(0,h*.38,w*.5,`rgba(255,140,50,${.17*f1})`);this.glow(w,h*.32,w*.5,`rgba(255,140,50,${.17*f2})`);
        const v=cx.createLinearGradient(0,0,0,h);v.addColorStop(0,"rgba(0,0,0,.35)");v.addColorStop(.4,"rgba(0,0,0,0)");cx.fillStyle=v;cx.fillRect(0,0,w,h);
        this.P.forEach(p=>{p.x+=(p.vx)*V;p.y+=(p.vy)*V;wrap(p,5);cx.fillStyle=`rgba(200,190,170,${p.a})`;cx.beginPath();cx.arc(p.x,p.y,p.r,0,6.28);
          cx.fill()});break}
      case "tavern":{
        const f=.85+.1*Math.sin(s*3.1)+.05*Math.sin(s*7.7);
        const g=cx.createLinearGradient(0,0,0,h);g.addColorStop(0,"rgba(60,30,10,.08)");g.addColorStop(1,`rgba(255,160,70,${.2*f})`);cx.fillStyle=g;
          cx.fillRect(0,0,w,h);
        this.glow(w*.5,h*1.05,w*.45,`rgba(255,150,60,${.22*f})`);
        this.P.forEach(p=>{p.x+=(p.vx)*V;p.y+=(p.vy)*V;wrap(p,5);cx.fillStyle=`rgba(255,200,130,${p.a})`;cx.beginPath();cx.arc(p.x,p.y,p.r,0,6.28);
          cx.fill()});break}
      case "storm":{
        cx.fillStyle="rgba(20,28,55,.28)";cx.fillRect(0,0,w,h);
        cx.strokeStyle="rgba(170,190,235,.3)";cx.lineWidth=1;cx.beginPath();
        this.P.forEach(p=>{p.x+=(p.v*.22*K)*V;p.y+=(p.v*K)*V;if(p.y>h+30){p.y=-30;p.x=R()*w*1.2-w*.2}if(p.x>w+30)p.x=-30;cx.moveTo(p.x,p.y);
          cx.lineTo(p.x-p.l*.22,p.y-p.l)});cx.stroke();
        if(R()<.003*K*K)this.flash=1;else if(this.flash>0&&this.flash<.5&&R()<.08)this.flash=.8;
        if(this.flash>.02){cx.fillStyle=`rgba(225,232,255,${this.flash*.32})`;cx.fillRect(0,0,w,h);this.flash*=.85}break}
      case "fire":{
        const f=.8+.12*Math.sin(s*2.3)+.08*Math.sin(s*5.9);
        const g=cx.createLinearGradient(0,0,0,h);g.addColorStop(.45,"rgba(0,0,0,0)");g.addColorStop(1,`rgba(210,70,25,${.3*f})`);cx.fillStyle=g;
          cx.fillRect(0,0,w,h);
        this.P.forEach((p,i)=>{p.life+=V;p.y+=(p.vy*K)*V;p.x+=(Math.sin(s*2+p.ph)*.5)*V;const a=Math.max(0,1-p.life/p.max);
          if(a<=0||p.y<-10){this.P[i]=this.ember(false);return}
          this.glow(p.x,p.y,p.r*5,`rgba(255,${p.g|0},60,${.18*a})`);cx.fillStyle=`rgba(255,${(p.g+40)|0},120,${.9*a})`;cx.beginPath();
            cx.arc(p.x,p.y,p.r*.7,0,6.28);cx.fill()});break}
      case "stars":{
        this.P.forEach(p=>{p.x+=(p.vx)*V;if(p.x>w+2)p.x=-2;const a=.35+.65*Math.abs(Math.sin(s*p.sp+p.ph));
          if(p.r>1.4)this.glow(p.x,p.y,p.r*5,`rgba(150,210,255,${.12*a})`);cx.fillStyle=`rgba(235,240,255,${a})`;cx.beginPath();cx.arc(p.x,p.y,p.r,0,6.28);
            cx.fill()});
        if(R()<.0015)this.flash=1;
        if(this.flash>.02){const fx=w*.2+R()*0,fy=h*.15;cx.strokeStyle=`rgba(200,235,255,${this.flash*.7})`;cx.lineWidth=1.5;cx.beginPath();
          cx.moveTo(w*(1-this.flash)*.9,h*.1+h*.3*(1-this.flash));cx.lineTo(w*(1-this.flash)*.9-60,h*.1+h*.3*(1-this.flash)+30);cx.stroke();
          this.flash*=.93}break}
      case "sand":{
        const g=cx.createLinearGradient(0,0,0,h);g.addColorStop(0,"rgba(120,70,30,.10)");g.addColorStop(1,"rgba(220,150,70,.18)");cx.fillStyle=g;
          cx.fillRect(0,0,w,h);
        this.P.forEach(p=>{p.x+=(p.v*K)*V;p.y+=(Math.sin(s*1.3+p.ph)*.35)*V;if(p.x>w+10){p.x=-10;p.y=R()*h}
          cx.strokeStyle=`rgba(235,200,140,${p.a})`;cx.lineWidth=1;cx.beginPath();cx.moveTo(p.x,p.y);cx.lineTo(p.x-p.l,p.y);cx.stroke()});break}
      case "snow":{
        const g=cx.createLinearGradient(0,0,0,h);g.addColorStop(0,"rgba(150,170,200,.06)");g.addColorStop(1,"rgba(200,215,235,.14)");cx.fillStyle=g;
          cx.fillRect(0,0,w,h);
        cx.fillStyle="rgba(240,245,255,.75)";
        this.P.forEach(p=>{p.y+=(p.v*K)*V;p.x+=(Math.sin(s*.8+p.ph)*.45)*V;if(p.y>h+5){p.y=-5;p.x=R()*w}wrap(p,5);cx.beginPath();cx.arc(p.x,p.y,p.r,0,6.28);
          cx.fill()});break}
      case "underdark":{
        lin([[0,"rgba(10,5,25,.22)"],[1,"rgba(40,20,70,.38)"]]);
        this.M.forEach(m=>{const a=.75+.25*Math.sin(s*1.3+m.ph);this.glow(m.x,m.y-m.s*.7,m.s*2.2,`rgba(${m.c},${.15*a*K})`);
          cx.fillStyle=`rgba(${m.c},${.24*a})`;cx.fillRect(m.x-m.s*.07,m.y-m.s*.7,m.s*.14,m.s*.7);cx.beginPath();
            cx.ellipse(m.x,m.y-m.s*.7,m.s*.55,m.s*.3,0,Math.PI,0);cx.fill()});
        this.P.forEach(p=>{p.y+=(p.vy*K)*V;p.x+=(Math.sin(s*.7+p.ph)*.3)*V;if(p.y<-10){p.y=h+10;p.x=R()*w}const a=.5+.5*Math.sin(s*1.7+p.ph);
          this.glow(p.x,p.y,p.r*6,`rgba(${p.c},${.14*a})`);cx.fillStyle=`rgba(${p.c},${.8*a})`;cx.beginPath();cx.arc(p.x,p.y,p.r*.6,0,6.28);cx.fill()});break}
      case "underwater":{
        lin([[0,"rgba(20,90,120,.20)"],[1,"rgba(5,30,60,.38)"]]);
        this.M.forEach(r=>{const ox=Math.sin(s*.3+r.ph)*40,g=cx.createLinearGradient(0,0,0,h*.85);
          g.addColorStop(0,`rgba(180,240,255,${.10*K*(.8+.2*Math.sin(s*.7+r.ph))})`);g.addColorStop(1,"rgba(180,240,255,0)");
          cx.fillStyle=g;cx.beginPath();cx.moveTo(r.x+ox,-10);cx.lineTo(r.x+ox+r.wd,-10);cx.lineTo(r.x+ox+r.wd*1.8+h*.25,h*.85);cx.lineTo(r.x+ox+h*.25,h*.85);
            cx.closePath();cx.fill()});
        cx.lineWidth=1;this.P.forEach(p=>{p.y+=(p.vy*K)*V;p.x+=(Math.sin(s*2+p.ph)*.4)*V;if(p.y<-10){p.y=h+10;p.x=R()*w}
          cx.strokeStyle="rgba(200,240,255,.45)";cx.beginPath();cx.arc(p.x,p.y,p.r,0,6.28);cx.stroke();cx.fillStyle="rgba(230,250,255,.6)";
            cx.fillRect(p.x-p.r*.4,p.y-p.r*.5,1.5,1.5)});break}
      case "ship":{
        lin([[0,"rgba(15,25,50,.26)"],[1,"rgba(10,30,50,.1)"]]);
        for(let L=0;L<3;L++){const base=h*(.8+L*.065),amp=(10+L*7)*K;cx.beginPath();cx.moveTo(0,h);
          for(let x=0;x<=w+20;x+=20)cx.lineTo(x,base+Math.sin(x*.008+s*(.6+L*.25)+L)*amp+Math.sin(x*.021-s*.9)*amp*.4);
          cx.lineTo(w,h);cx.closePath();cx.fillStyle=`rgba(${20+L*6},${50+L*8},${80+L*10},${.32+L*.12})`;cx.fill();
          if(L===0){cx.strokeStyle="rgba(200,230,255,.16)";cx.lineWidth=2;cx.stroke()}}
        if(R()<.004*K){const x0=R()*w;for(let i=0;i<26;i++)this.B.push({x:x0+(R()-.5)*40,y:h*.82,vx:(R()-.5)*2.4,vy:-(2+R()*3.5),life:0})}
        cx.fillStyle="rgba(220,240,255,.7)";this.B=this.B.filter(d=>{d.life++;d.vy+=.12;d.x+=(d.vx)*V;d.y+=(d.vy)*V;cx.fillRect(d.x,d.y,2,2);
          return d.life<60&&d.y<h});break}
      case "swamp":{
        lin([[.3,"rgba(0,0,0,0)"],[1,"rgba(40,60,25,.36)"]]);
        this.M.forEach(m=>{m.x+=(m.vx*K)*V;if(m.x<-m.r)m.x=w+m.r;if(m.x>w+m.r)m.x=-m.r;this.glow(m.x,m.y,m.r,"rgba(150,180,120,.08)")});
        this.P.forEach(p=>{p.vx=Math.max(-.5,Math.min(.5,p.vx+(R()-.5)*.05));p.vy=Math.max(-.3,Math.min(.3,p.vy+(R()-.5)*.04));p.x+=(p.vx*K)*V;p.y+=(p.vy)*V;
          if(p.y<h*.45)p.vy+=.02;wrap(p,10);
          const a=Math.max(0,Math.sin(s*p.sp+p.ph));this.glow(p.x,p.y,12,`rgba(210,240,90,${.32*a})`);cx.fillStyle=`rgba(240,255,160,${.9*a})`;
            cx.fillRect(p.x-1,p.y-1,2,2)});
        if(R()<.02*K)this.B.push({x:R()*w,y:h-R()*30,r:0,max:3+R()*6});
        cx.lineWidth=1;this.B=this.B.filter(b=>{b.r+=(.07)*V;cx.strokeStyle=`rgba(170,200,120,${.6*(1-b.r/b.max)})`;cx.beginPath();cx.arc(b.x,b.y,b.r,0,6.28);
          cx.stroke();return b.r<b.max});break}
      case "shadowfell":{
        cx.fillStyle="rgba(22,22,30,.40)";cx.fillRect(0,0,w,h);
        const v=cx.createRadialGradient(w/2,h/2,Math.min(w,h)*.25,w/2,h/2,Math.max(w,h)*.7);v.addColorStop(0,"rgba(0,0,0,0)");
          v.addColorStop(1,"rgba(0,0,0,.45)");cx.fillStyle=v;cx.fillRect(0,0,w,h);
        this.P.forEach(p=>{p.x+=(p.vx*K)*V;p.y+=(p.vy+Math.sin(s*.4+p.ph)*.15)*V;wrap(p,200);const a=.6+.4*Math.sin(s*.9+p.ph);
          cx.save();cx.translate(p.x,p.y);cx.scale(p.len,1);this.glow(0,0,40,`rgba(190,200,215,${.07*a*K})`);cx.restore()});
        this.M.forEach(m=>{m.y+=(m.v*K)*V;m.x+=(Math.sin(s*.6+m.ph)*.3)*V;if(m.y>h+5){m.y=-5;m.x=R()*w}cx.fillStyle="rgba(150,150,160,.45)";
          cx.fillRect(m.x,m.y,m.r,m.r)});break}
      case "avernus":{
        const pl=.5+.5*Math.pow(Math.sin(s*1.1),2);lin([[0,"rgba(40,0,0,.2)"],[.55,"rgba(60,8,0,.1)"],[1,`rgba(170,30,10,${.28+.12*pl*K})`]]);
        this.M.forEach(m=>{m.y+=(m.v*K)*V;m.x+=(Math.sin(s*.8+m.ph)*.4)*V;if(m.y>h+5){m.y=-5;m.x=R()*w}cx.fillStyle="rgba(95,88,82,.55)";
          cx.fillRect(m.x,m.y,m.r,m.r)});
        this.P.forEach((p,i)=>{p.life+=V;p.y+=(p.vy*K)*V;p.x+=(Math.sin(s*2+p.ph)*.5)*V;const a=Math.max(0,1-p.life/p.max);
          if(a<=0||p.y<-10){this.P[i]=this.ember(false);return}
          this.glow(p.x,p.y,p.r*5,`rgba(255,${(p.g*.7)|0},40,${.2*a})`);cx.fillStyle=`rgba(255,${(p.g*.8)|0},90,${.9*a})`;cx.beginPath();
            cx.arc(p.x,p.y,p.r*.7,0,6.28);cx.fill()});break}
      case "feywild":{
        lin([[0,"rgba(120,80,160,.10)"],[1,"rgba(60,120,100,.15)"]]);
        this.M.forEach(m=>{const a=Math.max(0,Math.sin(s*m.sp+m.ph));this.glow(m.x,m.y,10,`rgba(${m.c},${.3*a})`);cx.fillStyle=`rgba(255,255,255,${.8*a})`;
          cx.fillRect(m.x-.8,m.y-.8,1.6,1.6)});
        this.P.forEach(p=>{p.x+=((p.vx+Math.sin(s+p.ph||0)*.2)*K)*V;p.y+=(p.vy*K)*V;p.rot+=(p.vr)*V;if(p.y>h+10){p.y=-10;p.x=R()*w}if(p.x>w+10)p.x=-10;
          cx.save();cx.translate(p.x,p.y);cx.rotate(p.rot);cx.fillStyle=`rgba(${p.c},.7)`;cx.beginPath();cx.ellipse(0,0,p.sz,p.sz*.45,0,0,6.28);cx.fill();
            cx.restore()});break}
      case "temple":{
        lin([[0,"rgba(0,0,0,.28)"],[.5,"rgba(0,0,0,0)"],[1,"rgba(60,40,20,.12)"]]);
        this.M.forEach(r=>{const a=.09*(.8+.2*Math.sin(s*.5+r.ph))*K,g=cx.createLinearGradient(0,0,0,h);g.addColorStop(0,`rgba(255,225,160,${a})`);
          g.addColorStop(1,"rgba(255,225,160,0)");
          cx.fillStyle=g;cx.beginPath();cx.moveTo(r.x,-20);cx.lineTo(r.x+r.wd,-20);cx.lineTo(r.x+r.wd*1.6+h*.45,h);cx.lineTo(r.x+h*.45,h);cx.closePath();
            cx.fill()});
        this.P.forEach(p=>{p.x+=(p.vx)*V;p.y+=(p.vy)*V;wrap(p,5);const a=.25+.35*Math.abs(Math.sin(s*.8+p.ph));cx.fillStyle=`rgba(255,232,185,${a})`;
          cx.beginPath();cx.arc(p.x,p.y,p.r,0,6.28);cx.fill()});break}
      case "tower":{
        lin([[0,"rgba(20,15,45,.22)"],[1,"rgba(30,20,60,.18)"]]);
        this.P.forEach((p,i)=>{p.life+=(K)*V;p.y+=(p.vy*K)*V;p.rot+=(p.vr)*V;const a=Math.sin(Math.PI*Math.min(1,p.life/p.max));
          if(p.life>p.max||p.y<-60){this.P[i]=this.rune(false);this.P[i].y=R()*h;return}
          this.glow(p.x,p.y,p.s*2.2,`rgba(150,120,255,${.07*a})`);cx.save();cx.translate(p.x,p.y);cx.rotate(p.rot);cx.strokeStyle=`rgba(185,165,255,${.55*a})`;
            cx.lineWidth=1.3;
          cx.beginPath();cx.arc(0,0,p.s,0,6.28);cx.stroke();cx.beginPath();p.L.forEach(([a1,a2])=>{cx.moveTo(Math.cos(a1)*p.s,Math.sin(a1)*p.s);
            cx.lineTo(Math.cos(a2)*p.s,Math.sin(a2)*p.s)});
          if(p.tri){for(let k=0;k<3;k++){const an=k*2.094-1.57;cx[k?"lineTo":"moveTo"](Math.cos(an)*p.s*.55,Math.sin(an)*p.s*.55)}cx.closePath()}cx.stroke();
            cx.restore()});break}
      case "cityrain":{
        lin([[0,"rgba(20,25,40,.28)"],[1,"rgba(30,35,50,.18)"]]);
        this.M.forEach(l=>{const f=.8+.12*Math.sin(s*5.3+l.ph)+.08*Math.sin(s*11+l.ph)+R()*.04;this.glow(l.x,l.y,Math.min(w,h)*.35,`rgba(255,170,80,${.16*f})`);
          this.glow(l.x,l.y,18,`rgba(255,220,150,${.6*f})`)});
        cx.strokeStyle="rgba(180,195,220,.26)";cx.lineWidth=1;cx.beginPath();
        this.P.forEach(p=>{p.x+=(p.v*.15*K)*V;p.y+=(p.v*K)*V;if(p.y>h-4){if(R()<.35)this.B.push({x:p.x,y:h-R()*10,r:1});p.y=-20;
          p.x=R()*w*1.1-w*.05}cx.moveTo(p.x,p.y);cx.lineTo(p.x-p.l*.15,p.y-p.l)});cx.stroke();
        this.B=this.B.filter(b=>{b.r+=(.6)*V;cx.strokeStyle=`rgba(190,205,230,${.5*(1-b.r/9)})`;cx.beginPath();cx.ellipse(b.x,b.y,b.r,b.r*.3,0,0,6.28);
          cx.stroke();return b.r<9});break}
      case "astral":{
        this.M.forEach(m=>{m.x+=(m.vx)*V;if(m.x<-m.r)m.x=w+m.r;if(m.x>w+m.r)m.x=-m.r;this.glow(m.x,m.y,m.r,`rgba(${m.c},.08)`)});
        cx.lineWidth=1;this.P.forEach(p=>{const ox=p.x;p.x+=(p.v*K)*V;if(p.x>w+5){p.x=-5;
          p.y0=R()*h}const y=p.y0+Math.sin(p.x*p.f+p.ph)*p.amp,a=.4+.6*Math.abs(Math.sin(s*1.2+p.ph));
          cx.strokeStyle=`rgba(215,225,255,${.25*a})`;cx.beginPath();cx.moveTo(p.x-p.v*14,p.y0+Math.sin((p.x-p.v*14)*p.f+p.ph)*p.amp);cx.lineTo(p.x,y);
            cx.stroke();
          cx.fillStyle=`rgba(240,244,255,${a})`;cx.beginPath();cx.arc(p.x,y,p.r,0,6.28);cx.fill()});break}
      case "grave":{
        lin([[0,"rgba(20,35,60,.22)"],[.6,"rgba(0,0,0,0)"],[1,"rgba(60,75,95,.20)"]]);
        cx.fillStyle="rgba(6,8,14,.62)";this.B.forEach(t=>{const y=h-t.ht,x=t.x-t.wd/2;
          if(t.cross){cx.fillRect(t.x-t.wd*.14,y,t.wd*.28,t.ht);cx.fillRect(t.x-t.wd*.5,y+t.ht*.22,t.wd,t.wd*.26)}
          else{cx.beginPath();cx.moveTo(x,h);cx.lineTo(x,y+t.wd/2);cx.arc(t.x,y+t.wd/2,t.wd/2,Math.PI,0);cx.lineTo(x+t.wd,h);cx.closePath();cx.fill()}});
        this.M.forEach(m=>{m.x+=m.vx*M;if(m.x<-m.r)m.x=w+m.r;if(m.x>w+m.r)m.x=-m.r;this.glow(m.x,m.y,m.r,"rgba(175,190,215,.10)")});
        this.P.forEach(p=>{p.x+=(p.vx+Math.sin(s*.7+p.ph)*.3)*M;p.y+=Math.sin(s*.9+p.ph)*.25*V;wrap(p,30);const a=.55+.45*Math.sin(s*p.sp*2+p.ph);
          this.glow(p.x,p.y,28,`rgba(110,180,255,${.22*a})`);cx.fillStyle=`rgba(210,235,255,${.8*a})`;cx.beginPath();cx.arc(p.x,p.y,2.2,0,6.28);
            cx.fill()});break}
      case "crystal":{
        lin([[0,"rgba(30,20,60,.20)"],[1,"rgba(20,40,80,.28)"]]);
        this.M.forEach(c=>{const b=c.up?h+4:-4,dir=c.up?-1:1,tx=c.x+c.lean*c.ht,ty=b+dir*c.ht,pul=.75+.25*Math.sin(s*.8+c.ph);
          this.glow(tx,ty,c.wd*3,`hsla(${c.hue},90%,65%,${.10*pul})`);
          cx.fillStyle=`hsla(${c.hue},70%,60%,${.24*pul})`;cx.strokeStyle=`hsla(${c.hue},85%,78%,${.38*pul})`;cx.lineWidth=1.2;
          cx.beginPath();cx.moveTo(c.x-c.wd/2,b);cx.lineTo(tx,ty);cx.lineTo(c.x+c.wd/2,b);cx.closePath();cx.fill();cx.stroke();
          cx.beginPath();cx.moveTo(c.x,b);cx.lineTo(tx,ty);cx.stroke();
          const x2=c.x+c.wd*.7,h2=c.ht*.55,tx2=x2+c.lean*h2*1.6,ty2=b+dir*h2;cx.beginPath();cx.moveTo(x2-c.wd*.3,b);cx.lineTo(tx2,ty2);cx.lineTo(x2+c.wd*.3,b);
            cx.closePath();cx.fill();cx.stroke()});
        this.P.forEach(g=>{const c=this.M[g.m];if(!c)return;const a=Math.pow(Math.max(0,Math.sin(s*g.sp+g.ph)),14);if(a<.02)return;
          const b=c.up?h+4:-4,dir=c.up?-1:1,x=c.x+c.lean*c.ht*g.f,y=b+dir*c.ht*g.f,L=10+18*a;
          cx.strokeStyle=`rgba(240,250,255,${a})`;cx.lineWidth=1.3;cx.beginPath();cx.moveTo(x-L,y);cx.lineTo(x+L,y);cx.moveTo(x,y-L);cx.lineTo(x,y+L);
            cx.stroke();this.glow(x,y,L*1.4,`hsla(${c.hue},100%,80%,${.35*a})`)});
        if(R()<.025*V){const top=this.M.filter(x=>!x.up),c=top[Math.floor(R()*top.length)];if(c)this.B.push({x:c.x+c.lean*c.ht,y:c.ht,vy:0,hue:c.hue})}
        this.B=this.B.filter(d=>{d.vy+=.25*V;d.y+=d.vy*V;if(d.y>h)return false;cx.fillStyle=`hsla(${d.hue},80%,85%,.7)`;cx.fillRect(d.x-1,d.y,2,5);
          return true});break}
      case "aurora":{
        lin([[0,"rgba(5,10,30,.28)"],[1,"rgba(10,30,45,.18)"]]);
        this.P.forEach(p=>{const a=.3+.7*Math.abs(Math.sin(s*p.sp+p.ph));cx.fillStyle=`rgba(230,240,255,${a*.8})`;cx.fillRect(p.x,p.y,p.r,p.r)});
        cx.save();cx.globalCompositeOperation="lighter";
        this.M.forEach(b=>{const g=cx.createLinearGradient(0,0,0,b.len);g.addColorStop(0,`rgba(${b.c},0)`);
          g.addColorStop(.25,`rgba(${b.c},${.14*Math.min(1.6,K)})`);g.addColorStop(1,`rgba(${b.c},0)`);cx.fillStyle=g;
          for(let x=-10;x<w+10;x+=7){const y=b.y+Math.sin(x*b.f+s*b.sp+b.ph)*b.amp+Math.sin(x*b.f2-s*b.sp2)*b.amp*.4,a=.55+.45*Math.sin(x*.013+s*.6+b.ph);
            cx.globalAlpha=Math.max(0,a);cx.setTransform(1,0,0,1,x,y);cx.fillRect(0,0,7,b.len)}});
        cx.restore();
        cx.fillStyle="rgba(10,16,26,.5)";cx.beginPath();cx.moveTo(0,h);for(let x=0;x<=w+40;
          x+=40)cx.lineTo(x,h*.9+Math.sin(x*.004)*h*.03+Math.sin(x*.011+1)*h*.015);cx.lineTo(w,h);cx.closePath();cx.fill();break}
      case "autumn":{
        lin([[0,"rgba(60,30,10,.10)"],[1,"rgba(120,60,20,.22)"]]);
        const gust=Math.pow(Math.max(0,Math.sin(s*.23)),4)*2.2;
        this.P.forEach(p=>{p.x+=(p.vx+gust+Math.sin(s*1.1+p.ph)*.6)*M;p.y+=(p.vy+Math.sin(s*2+p.ph)*.3)*M;p.rot+=p.vr*(1+gust)*V;if(p.y>h+12){p.y=-12;
          p.x=R()*w}if(p.x>w+12)p.x=-12;
          cx.save();cx.translate(p.x,p.y);cx.rotate(p.rot);cx.scale(1,.55+.45*Math.sin(s*2.5+p.ph));cx.fillStyle=`rgba(${p.c},.8)`;
          cx.beginPath();cx.moveTo(-p.sz,0);cx.quadraticCurveTo(0,-p.sz*.7,p.sz,0);cx.quadraticCurveTo(0,p.sz*.7,-p.sz,0);cx.fill();
          cx.strokeStyle="rgba(60,25,10,.5)";cx.lineWidth=.8;cx.beginPath();cx.moveTo(-p.sz,0);cx.lineTo(p.sz*1.2,0);cx.stroke();cx.restore()});break}
      case "meadow":{
        lin([[0,"rgba(255,215,130,.16)"],[.6,"rgba(255,235,170,.04)"],[1,"rgba(110,160,60,.20)"]]);
        this.M.forEach(r=>{const a=.10*(.8+.2*Math.sin(s*.4+r.ph))*K,g=cx.createLinearGradient(0,0,0,h);g.addColorStop(0,`rgba(255,240,190,${a})`);
          g.addColorStop(1,"rgba(255,240,190,0)");
          cx.fillStyle=g;cx.beginPath();cx.moveTo(r.x,-20);cx.lineTo(r.x+r.wd,-20);cx.lineTo(r.x+r.wd*1.5+h*.35,h);cx.lineTo(r.x+h*.35,h);cx.closePath();
            cx.fill()});
        this.P.forEach(p=>{p.x+=(p.vx+Math.sin(s*.5+p.ph)*.15)*V;p.y+=p.vy*V;wrap(p,5);const a=.35+.4*Math.abs(Math.sin(s*.9+p.ph));
          cx.fillStyle=`rgba(255,240,170,${a})`;cx.beginPath();cx.arc(p.x,p.y,p.r,0,6.28);cx.fill()});
        this.B.forEach(b=>{b.vx=Math.max(-1.2,Math.min(1.2,b.vx+(R()-.5)*.12));b.vy=Math.max(-.8,Math.min(.8,b.vy+(R()-.5)*.1));if(b.y<h*.2)b.vy+=.03;
          if(b.y>h*.9)b.vy-=.03;b.x+=b.vx*V;b.y+=(b.vy+Math.sin(s*3+b.ph)*.4)*V;wrap(b,20);
          const f=Math.abs(Math.sin(s*14+b.ph));cx.save();cx.translate(b.x,b.y);cx.scale(1.7,1.7);cx.fillStyle=`rgba(${b.c},.85)`;
          cx.beginPath();cx.ellipse(-4*f,-2,5*f+.5,4,-.5,0,6.28);cx.ellipse(4*f,-2,5*f+.5,4,.5,0,6.28);cx.fill();cx.fillStyle="rgba(50,40,30,.8)";
            cx.fillRect(-.7,-4,1.4,6);cx.restore()});break}
      case "bloodmoon":{
        lin([[0,"rgba(40,0,10,.26)"],[1,"rgba(20,0,5,.30)"]]);const m=this.M[0],pl=.85+.15*Math.sin(s*.5);
        this.glow(m.x,m.y,m.r*4,`rgba(200,20,30,${.18*pl*K})`);
        {const g=cx.createRadialGradient(m.x-m.r*.3,m.y-m.r*.3,m.r*.1,m.x,m.y,m.r);g.addColorStop(0,"rgba(235,90,70,.85)");
          g.addColorStop(1,"rgba(150,15,20,.85)");cx.fillStyle=g;cx.beginPath();cx.arc(m.x,m.y,m.r,0,6.28);cx.fill();
         cx.fillStyle="rgba(110,10,15,.35)";[[.3,-.2,.18],[-.35,.25,.13],[.1,.4,.1],[-.1,-.45,.08]].forEach(([a,b,r])=>{cx.beginPath();
           cx.arc(m.x+a*m.r,m.y+b*m.r,r*m.r,0,6.28);cx.fill()})}
        this.B.forEach(c=>{c.x+=c.vx*M;if(c.x-c.wd>w)c.x=-c.wd;cx.save();cx.translate(c.x,c.y);cx.scale(c.wd/200,1);this.glow(0,0,100,"rgba(30,5,10,.55)");
          cx.restore()});
        cx.fillStyle="rgba(5,0,3,.75)";this.P.forEach(b=>{b.x+=b.vx*M;b.y+=Math.sin(s*1.3+b.ph)*.5*V;if(b.x>w+30)b.x=-30;if(b.x<-30)b.x=w+30;
          const f=Math.sin(s*b.sp+b.ph),z=b.sz;
          cx.beginPath();cx.moveTo(b.x,b.y);cx.quadraticCurveTo(b.x-z*.5,b.y-z*.6*f,b.x-z*1.3,b.y-z*.3*f);cx.quadraticCurveTo(b.x-z*.6,b.y+z*.1,b.x,b.y+z*.15);
            cx.quadraticCurveTo(b.x+z*.6,b.y+z*.1,b.x+z*1.3,b.y-z*.3*f);cx.quadraticCurveTo(b.x+z*.5,b.y-z*.6*f,b.x,b.y);cx.fill()});
        cx.fillStyle="rgba(8,2,6,.6)";cx.beginPath();cx.moveTo(0,h);[[0,.9],[.08,.86],[.12,.86],[.12,.78],[.14,.74],[.16,.78],[.16,.84],[.24,.84],[.24,.8],[.26,
          .8],[.26,.84],[.32,.88],[.5,.9],[.62,.87],[.7,.87],[.7,.76],[.72,.7],[.74,.76],[.74,.82],[.8,.82],[.8,.86],[1,.9],[1,1]].forEach(([a,b])=>
          cx.lineTo(a*w,b*h));cx.closePath();cx.fill();break}
      case "ritual":{
        const cxp=w/2,cyp=h*.52,sp=this.rit||1;this.rot+=.016*V*sp;const pl=.7+.3*Math.sin(s*1.6*sp);
        this.glow(cxp,cyp,this.M[0].r*1.3,`rgba(140,40,200,${.12*pl*K*(.8+.2*sp)})`);
        this.M.forEach((o,i)=>{const ang=this.rot*o.sp*10*o.dir;cx.save();cx.translate(cxp,cyp);cx.rotate(ang);
          cx.strokeStyle=`rgba(200,140,255,${Math.min(.7,.35*pl*(.85+.15*sp))})`;cx.lineWidth=1.6;
          cx.beginPath();cx.arc(0,0,o.r,0,6.28);cx.stroke();cx.beginPath();cx.arc(0,0,o.r-22,0,6.28);cx.stroke();
          o.g.forEach((L,j)=>{cx.save();cx.rotate(j/o.n*6.28);cx.translate(0,-(o.r-11));cx.beginPath();L.forEach(([x1,y1,x2,y2])=>{cx.moveTo(x1*5.4,y1*5.4);
            cx.lineTo(x2*5.4,y2*5.4)});cx.stroke();cx.restore()});
          if(i===2){cx.beginPath();for(let k=0;k<=5;k++){const an=k*2.513-1.5708;cx[k?"lineTo":"moveTo"](Math.cos(an)*o.r*.92,Math.sin(an)*o.r*.92)}cx.stroke()}
          cx.restore()});
        this.P.forEach(p=>{p.a+=p.v*V*sp;const x=cxp+Math.cos(p.a)*p.r,y=cyp+Math.sin(p.a)*p.r*.95,a=.4+.6*Math.abs(Math.sin(s*2+p.ph));
          this.glow(x,y,8,`rgba(220,160,255,${.4*a})`)});break}
      case "farrealm":{
        cx.fillStyle="rgba(6,0,14,.32)";cx.fillRect(0,0,w,h);
        this.M.forEach(m=>{m.x+=m.vx*M;m.y+=m.vy*M;wrap(m,m.r);const sc=1+.25*Math.sin(s*.7+m.ph);cx.save();cx.translate(m.x,m.y);cx.rotate(s*.1+m.ph);
          cx.scale(sc,1/sc);this.glow(0,0,m.r,`rgba(${m.c},.11)`);cx.restore()});
        cx.lineWidth=3;cx.strokeStyle="rgba(90,40,110,.35)";this.B.forEach(t=>{const L=Math.min(w,h)*t.len,e=t.side,ox=e===1?w:e===3?0:t.at*w,oy=e===0?0:e===2?
          h:t.at*h,nx=e===1?-1:e===3?1:0,ny=e===0?1:e===2?-1:0;
          cx.beginPath();cx.moveTo(ox,oy);for(let k=1;k<=12;k++){const q=k/12,wob=Math.sin(s*1.2+t.ph+q*5)*40*q;
            cx.lineTo(ox+nx*L*q+ny*wob,oy+ny*L*q+nx*wob)}cx.stroke()});
        this.P.forEach((e,i)=>{e.t+=V/60;if(e.t>e.open+1.2){this.P[i]=this.eye(false);return}if(e.t<0)return;
          const o=e.t<1?e.t:e.t>e.open?Math.max(0,1-(e.t-e.open)/1.2):(Math.abs(Math.sin(e.t*2.1))<.04?.15:1),z=e.s;
          this.glow(e.x,e.y,z*3,`rgba(140,255,170,${.12*o})`);cx.fillStyle=`rgba(225,240,200,${.55*o})`;cx.beginPath();cx.moveTo(e.x-z*1.6,e.y);
            cx.quadraticCurveTo(e.x,e.y-z*1.2*o,e.x+z*1.6,e.y);cx.quadraticCurveTo(e.x,e.y+z*1.2*o,e.x-z*1.6,e.y);cx.fill();
          if(o>.2){const lx=Math.sin(s*.8+i)*z*.4;cx.fillStyle=`rgba(40,160,80,${.8*o})`;cx.beginPath();cx.arc(e.x+lx,e.y,z*.55*o,0,6.28);cx.fill();
            cx.fillStyle=`rgba(0,0,0,${.9*o})`;cx.beginPath();cx.ellipse(e.x+lx,e.y,z*.12,z*.45*o,0,0,6.28);cx.fill()}});break}
      case "mechanus":{
        lin([[0,"rgba(40,30,15,.20)"],[1,"rgba(60,45,20,.24)"]]);
        const tick=Math.floor(s*1.2),step=tick+Math.min(1,(s*1.2-tick)*4);   // the gears move in small ticks
        this.M.forEach(g=>{const ang=g.dir*step*(12/g.r)+g.ph;cx.save();cx.translate(g.x,g.y);cx.rotate(ang);
          cx.fillStyle="rgba(190,150,80,.13)";cx.strokeStyle="rgba(220,180,110,.32)";cx.lineWidth=1.5;cx.beginPath();
          for(let k=0;k<g.t;k++){const a0=k/g.t*6.28,a1=(k+.5)/g.t*6.28,ro=g.r,ri=g.r*.84;cx.lineTo(Math.cos(a0)*ri,Math.sin(a0)*ri);
            cx.lineTo(Math.cos(a0+.08)*ro,Math.sin(a0+.08)*ro);cx.lineTo(Math.cos(a1-.08)*ro,Math.sin(a1-.08)*ro);cx.lineTo(Math.cos(a1)*ri,Math.sin(a1)*ri)}
          cx.closePath();cx.fill();cx.stroke();cx.beginPath();cx.arc(0,0,g.r*.55,0,6.28);cx.stroke();cx.beginPath();cx.arc(0,0,g.r*.14,0,6.28);cx.stroke();
          for(let k=0;k<4;k++){cx.rotate(1.5708);cx.beginPath();cx.moveTo(g.r*.14,0);cx.lineTo(g.r*.55,0);cx.stroke()}cx.restore()});
        this.P.forEach(p=>{p.x+=p.vx*V;p.y+=p.vy*V;wrap(p,5);cx.fillStyle="rgba(230,200,140,.35)";cx.fillRect(p.x,p.y,p.r,p.r)});break}
      case "clouds":{
        lin([[0,"rgba(40,90,170,.24)"],[.55,"rgba(120,170,225,.14)"],[1,"rgba(220,235,250,.18)"]]);
        this.P.sort((a,b)=>a.sc-b.sc);this.P.forEach((c,i)=>{c.x+=c.v*M;if(c.x-300*c.sc>w){this.P[i]=this.cloud(false);return}
          c.b.forEach(([dx,dy,r])=>this.glow(c.x+dx*c.sc,c.y+dy*c.sc,r*c.sc*1.5,`rgba(250,252,255,${.16+.1*c.sc})`))});
        if(R()<.02*V)this.B.push({x:-50,y:R()*h,l:80+R()*160,v:18+R()*14});
        cx.strokeStyle="rgba(255,255,255,.18)";cx.lineWidth=1;this.B=this.B.filter(b=>{b.x+=b.v*V;cx.beginPath();cx.moveTo(b.x,b.y);cx.lineTo(b.x-b.l,b.y);
          cx.stroke();return b.x-b.l<w});break}
      case "festival":{
        lin([[0,"rgba(15,15,50,.22)"],[1,"rgba(60,30,60,.18)"]]);
        this.P.forEach((l,i)=>{l.y+=l.vy*M;l.x+=Math.sin(s*.6+l.ph)*.3*V;if(l.y<-40){this.P[i]=this.lantern(false);
          return}const f=.8+.2*Math.sin(s*7+l.ph)+R()*.05,a=Math.max(0,Math.min(1,l.y/(h*.25)));
          this.glow(l.x,l.y,l.s*4,`hsla(${l.hue},100%,60%,${.22*f*a})`);cx.fillStyle=`hsla(${l.hue},95%,${62+8*f}%,${.85*a})`;cx.beginPath();
            cx.ellipse(l.x,l.y,l.s*.75,l.s,0,0,6.28);cx.fill();cx.fillStyle=`rgba(255,240,200,${.8*a*f})`;cx.fillRect(l.x-l.s*.2,l.y+l.s*.3,l.s*.4,l.s*.4)});
        if(R()<.006*V*K){const x=w*(.15+R()*.7),y=h*(.1+R()*.3),hue=R()*360;for(let i=0;i<36;i++){const an=i/36*6.28,v=2+R()*2.5;
          this.B.push({x,y,vx:Math.cos(an)*v,vy:Math.sin(an)*v,life:0,max:55+R()*30,hue:(hue+R()*40)%360})}}
        this.B=this.B.filter(p=>{p.life+=V;p.vy+=.035*V;p.vx*=.985;p.vy*=.985;p.x+=p.vx*V;p.y+=p.vy*V;const a=1-p.life/p.max;if(a<=0)return false;
          this.glow(p.x,p.y,6,`hsla(${p.hue},100%,65%,${.35*a})`);cx.fillStyle=`hsla(${p.hue},100%,80%,${a})`;cx.fillRect(p.x-1,p.y-1,2,2);return true});break}
      case "battle":{
        const f=.8+.15*Math.sin(s*1.7)+.05*Math.sin(s*5.3);lin([[0,"rgba(30,25,25,.26)"],[.6,"rgba(60,30,15,.16)"],[1,`rgba(190,75,25,${.34*f})`]]);
        if(R()<.004*V*K){this.flash=1;this.fx0=w*(.15+R()*.7)}if(this.flash>.02){this.glow(this.fx0||w/2,h,w*.35,`rgba(255,150,60,${.25*this.flash})`);
          this.flash*=.93}
        this.M.forEach(m=>{m.x+=m.vx*M;m.y+=m.vy*M;if(m.y<-m.r||m.x<-m.r){m.x=R()*w+m.r*.5;m.y=h+m.r*.6}this.glow(m.x,m.y,m.r,"rgba(85,76,70,.26)")});
        this.P.forEach((p,i)=>{p.life+=V;p.y+=p.vy*M;p.x+=(Math.sin(s*2+p.ph)*.5-.4)*V;const a=Math.max(0,1-p.life/p.max);
          if(a<=0||p.y<-10){this.P[i]=this.ember(false);return}
          this.glow(p.x,p.y,p.r*4,`rgba(255,${p.g|0},50,${.16*a})`);cx.fillStyle=`rgba(255,${(p.g+40)|0},110,${.85*a})`;cx.beginPath();
            cx.arc(p.x,p.y,p.r*.6,0,6.28);cx.fill()});
        this.B.forEach(m=>{m.y+=m.v*M;m.x+=(Math.sin(s*.6+m.ph)*.3-.3)*V;if(m.y>h+5){m.y=-5;m.x=R()*w}if(m.x<-5)m.x=w+5;cx.fillStyle="rgba(120,115,110,.5)";
          cx.fillRect(m.x,m.y,m.r,m.r)});break}
      case "mine":{
        lin([[0,"rgba(20,12,5,.34)"],[1,"rgba(40,26,12,.24)"]]);
        const bw=Math.max(18,w*.022),top=h*.04+bw*.9;cx.fillStyle="rgba(30,18,8,.55)";cx.fillRect(w*.04,0,bw,h);cx.fillRect(w*.96-bw,0,bw,h);
          cx.fillRect(0,h*.04,w,bw*.9);
        const L=this.M.map(l=>{const an=Math.sin(s*1.3+l.ph)*l.amp*Math.min(1.6,K),x=l.x+Math.sin(an)*l.len,y=top+Math.cos(an)*l.len;
          cx.strokeStyle="rgba(20,14,8,.7)";cx.lineWidth=2;cx.beginPath();cx.moveTo(l.x,top);cx.lineTo(x,y);cx.stroke();
          const f=.85+.1*Math.sin(s*9+l.ph)+R()*.05;this.glow(x,y,Math.min(w,h)*.42,`rgba(255,170,70,${.22*f})`);this.glow(x,y,26,`rgba(255,220,150,${.85*f})`);
          cx.fillStyle="rgba(40,26,12,.9)";cx.fillRect(x-7,y-12,14,4);return[x,y]});
        const LR=Math.min(w,h)*.42;this.P.forEach(p=>{p.x+=p.vx*V;p.y+=p.vy*V;wrap(p,5);let lit=0;
          L.forEach(([x,y])=>{lit=Math.max(lit,1-Math.hypot(p.x-x,p.y-y)/LR)});
          const a=.08+.6*Math.max(0,lit)*(.7+.3*Math.sin(s+p.ph));cx.fillStyle=`rgba(255,220,170,${a})`;cx.beginPath();cx.arc(p.x,p.y,p.r,0,6.28);
            cx.fill()});break}
      case "ethereal":{
        lin([[0,"rgba(80,110,140,.16)"],[1,"rgba(120,150,170,.20)"]]);const sh=.5+.5*Math.sin(s*.35);
        this.glow(w*.3,h*.4,w*.5,`rgba(170,200,230,${.06+.04*sh})`);this.glow(w*.75,h*.65,w*.45,`rgba(150,190,220,${.05+.04*(1-sh)})`);
        this.P.forEach((g,i)=>{g.x+=g.dir*g.v*M;if(g.x<-280||g.x>w+280){this.P[i]=this.ghost(false);return}const y=g.y+Math.sin(s*.8+g.ph)*18,z=g.s;
          cx.save();cx.translate(g.x,y);cx.scale(g.dir,1);this.glow(0,-z*.3,z*1.2,"rgba(200,225,255,.07)");cx.fillStyle="rgba(215,232,250,.12)";
          cx.beginPath();cx.arc(0,-z*.55,z*.32,Math.PI*.95,Math.PI*2.05);cx.bezierCurveTo(z*.42,-z*.1,z*.25,z*.45,-z*.1,z*.7);
          for(let k=1;k<=4;k++){const q=k/4;cx.lineTo(-z*(.1+q*1.2),z*(.7-q*.45)+Math.sin(s*3+g.ph+k)*z*.12)}
          cx.bezierCurveTo(-z*1.1,0,-z*.55,-z*.2,-z*.32,-z*.5);cx.closePath();cx.fill();
          cx.fillStyle="rgba(10,20,35,.22)";cx.beginPath();cx.arc(z*.12,-z*.6,z*.05,0,6.28);cx.arc(-z*.05,-z*.6,z*.05,0,6.28);cx.fill();cx.restore()});
        this.M.forEach(m=>{m.x+=m.vx*V;m.y+=m.vy*V;wrap(m,5);const a=.25+.45*Math.abs(Math.sin(s*1.1+m.ph));cx.fillStyle=`rgba(225,240,255,${a})`;
          cx.fillRect(m.x,m.y,m.r,m.r)});break}
      case "sewer":{
        lin([[0,"rgba(10,18,10,.32)"],[1,"rgba(30,50,25,.26)"]]);const wy=this.M[0].y;
        const g=cx.createLinearGradient(0,wy,0,h);g.addColorStop(0,"rgba(70,105,55,.42)");g.addColorStop(1,"rgba(25,45,22,.55)");cx.fillStyle=g;cx.beginPath();
          cx.moveTo(0,h);
        for(let x=0;x<=w+20;x+=20)cx.lineTo(x,wy+Math.sin(x*.012+s*.9)*3+Math.sin(x*.031-s*1.3)*2);cx.lineTo(w,h);cx.closePath();cx.fill();
        cx.strokeStyle="rgba(170,210,150,.18)";cx.lineWidth=1.5;for(let L=1;L<4;L++){cx.beginPath();for(let x=0;x<=w;
          x+=24){const y=wy+L*h*.035+Math.sin(x*.01+s*(.7+L*.2)+L)*2.5;x?cx.lineTo(x,y):cx.moveTo(x,y)}cx.stroke()}
        this.P.forEach(p=>{p.y+=p.vy*M;p.x+=Math.sin(s*.4+p.ph)*.2*V;if(p.y<-p.r){p.y=wy+p.r*.3;
          p.x=R()*w}const a=Math.min(1,(wy-p.y)/(h*.2)+.3)*Math.min(1,p.y/(h*.3));this.glow(p.x,p.y,p.r,`rgba(170,190,160,${.07*Math.max(0,a)})`)});
        if(R()<.03*V)this.B.push({x:R()*w,y:0,vy:0,k:"d"});
        this.B=this.B.filter(d=>{if(d.k==="d"){d.vy+=.3*V;d.y+=d.vy*V;cx.fillStyle="rgba(190,220,170,.6)";cx.fillRect(d.x-1,d.y,2,6);if(d.y>=wy){d.k="r";d.r=1;
          d.y=wy+R()*h*.08}return true}
          d.r+=.5*V;cx.strokeStyle=`rgba(190,220,170,${.5*(1-d.r/26)})`;cx.beginPath();cx.ellipse(d.x,d.y,d.r,d.r*.28,0,0,6.28);cx.stroke();
            return d.r<26});break}
    }
    if(K>1.03&&this.kind!=="none"){const tint={bloodmoon:"220,20,30",farrealm:"120,255,150",ritual:"170,60,255",crystal:"150,120,255",aurora:"90,255,170",storm:
      "110,140,255",fire:"255,90,30",avernus:"255,60,20",underdark:"170,90,255",underwater:"40,140,200",astral:"150,120,255",tower:"150,110,255",feywild:
      "255,120,190"}[this.kind]||"200,40,50";
      const a=(K-1)*.22*(.6+.4*Math.sin(s*2.6)),v=cx.createRadialGradient(w/2,h/2,Math.min(w,h)*.3,w/2,h/2,Math.max(w,h)*.75);v.addColorStop(0,"rgba(0,0,0,0)");
        v.addColorStop(1,`rgba(${tint},${a})`);cx.fillStyle=v;cx.fillRect(0,0,w,h)}
    {const now=performance.now();if(this.weather!=="none")this.drawW(s,V);const base=this.cx;if(this.fxc){this.cx=this.fxc;
      this.fxc.clearRect(0,0,w,h)}try{this.drawBF(s,now,V);this.drawFx(now);this.drawSP(V)}finally{this.cx=base;base.globalAlpha=1;
      if(this.fxc)this.fxc.globalAlpha=1}}
  }
};

/* known effects; true = needs Concentration */
/* This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.
   spells that leave something to track: [name, level, concentration, battlefield/area, duration, classes]
   classes: B bard, C cleric, D druid, P paladin, R ranger, S sorcerer, K warlock, W wizard */
const SRD_SPELLS=[["Guidance",0,1,0,"1 min","CD"],["Resistance",0,1,0,"1 min","CD"],["Shillelagh",0,0,0,"1 min","D"],["Bane",1,1,0,"1 min","BCK"],["Bless",1,1,
  0,"1 min","CP"],["Charm Person",1,0,0,"1 h","BDSKW"],["Divine Favor",1,0,0,"1 min","P"],["Ensnaring Strike",1,1,0,"1 min","R"],["Entangle",1,1,1,"1 min",
  "DR"],["Expeditious Retreat",1,1,0,"10 min","SKW"],["Faerie Fire",1,1,0,"1 min","BD"],["Fog Cloud",1,1,1,"1 h","DRSW"],["Grease",1,0,1,"1 min","SW"],
  ["Guiding Bolt",1,0,0,"1 round","C"],["Heroism",1,1,0,"1 min","BP"],["Hex",1,1,0,"1 h","K"],["Hideous Laughter",1,1,0,"1 min","BKW"],["Hunter's Mark",1,1,0,
  "1 h","R"],["Longstrider",1,0,0,"1 h","BDRW"],["Mage Armor",1,0,0,"8 h","SW"],["Protection from Evil and Good",1,1,0,"10 min","CDPKW"],["Sanctuary",1,0,0,
  "1 min","C"],["Searing Smite",1,0,0,"1 min","P"],["Shield",1,0,0,"1 round","SW"],["Shield of Faith",1,1,0,"10 min","CP"],["Sleep",1,1,0,"1 min","BSW"],["Aid",
  2,0,0,"8 h","BCDPR"],["Alter Self",2,1,0,"1 h","SW"],["Barkskin",2,0,0,"1 h","DR"],["Blindness/Deafness",2,0,0,"1 min","BCSW"],["Blur",2,1,0,"1 min","SW"],
  ["Calm Emotions",2,1,0,"1 min","BC"],["Darkness",2,1,1,"10 min","SKW"],["Enhance Ability",2,1,0,"1 h","BCDRSW"],["Enlarge/Reduce",2,1,0,"1 min","BDSW"],
  ["Flame Blade",2,1,0,"10 min","DS"],["Flaming Sphere",2,1,1,"1 min","DSW"],["Gust of Wind",2,1,1,"1 min","DRSW"],["Heat Metal",2,1,0,"1 min","BD"],
  ["Hold Person",2,1,0,"1 min","BCDSKW"],["Invisibility",2,1,0,"1 h","BSKW"],["Levitate",2,1,0,"10 min","SW"],["Magic Weapon",2,0,0,"1 h","PRSW"],["Mind Spike",
  2,1,0,"1 h","SKW"],["Mirror Image",2,0,0,"1 min","BSKW"],["Moonbeam",2,1,1,"1 min","D"],["Pass without Trace",2,1,0,"1 h","DR"],["Phantasmal Force",2,1,0,
  "1 min","BSW"],["Protection from Poison",2,0,0,"1 h","CDPR"],["Ray of Enfeeblement",2,1,0,"1 min","KW"],["See Invisibility",2,0,0,"1 h","BSW"],
  ["Shining Smite",2,1,0,"1 min","P"],["Silence",2,1,1,"10 min","BCR"],["Spider Climb",2,1,0,"1 h","SKW"],["Spike Growth",2,1,1,"10 min","DR"],
  ["Spiritual Weapon",2,1,0,"1 min","C"],["Suggestion",2,1,0,"8 h","BSKW"],["Warding Bond",2,0,0,"1 h","CP"],["Web",2,1,1,"1 h","SW"],["Beacon of Hope",3,1,0,
  "1 min","C"],["Bestow Curse",3,1,0,"1 min","BCW"],["Blink",3,0,0,"1 min","SW"],["Call Lightning",3,1,1,"10 min","D"],["Conjure Animals",3,1,1,"10 min","DR"],
  ["Fear",3,1,0,"1 min","BSKW"],["Fly",3,1,0,"10 min","SKW"],["Gaseous Form",3,1,0,"1 h","SKW"],["Haste",3,1,0,"1 min","SW"],["Hypnotic Pattern",3,1,0,"1 min",
  "BSKW"],["Magic Circle",3,0,1,"1 h","CPKW"],["Protection from Energy",3,1,0,"1 h","CDRSW"],["Sleet Storm",3,1,1,"1 min","DSW"],["Slow",3,1,0,"1 min","BSW"],
  ["Spirit Guardians",3,1,1,"10 min","C"],["Stinking Cloud",3,1,1,"1 min","BSW"],["Vampiric Touch",3,1,0,"1 min","SKW"],["Wind Wall",3,1,1,"1 min","DR"],
  ["Aura of Life",4,1,0,"10 min","CP"],["Banishment",4,1,0,"1 min","CPSKW"],["Black Tentacles",4,1,1,"1 min","W"],["Compulsion",4,1,0,"1 min","B"],["Confusion",
  4,1,0,"1 min","BDSW"],["Conjure Minor Elementals",4,1,0,"10 min","DW"],["Death Ward",4,0,0,"8 h","CP"],["Dominate Beast",4,1,0,"1 min","DRS"],["Fire Shield",
  4,0,0,"10 min","DSW"],["Freedom of Movement",4,0,0,"1 h","BCDR"],["Greater Invisibility",4,1,0,"1 min","BSW"],["Guardian of Faith",4,0,1,"8 h","C"],
  ["Phantasmal Killer",4,1,0,"1 min","BW"],["Polymorph",4,1,0,"1 h","BDSW"],["Resilient Sphere",4,1,0,"1 min","W"],["Stoneskin",4,1,0,"1 h","DRSW"],
  ["Wall of Fire",4,1,1,"1 min","DSW"],["Animate Objects",5,1,0,"1 min","BSW"],["Antilife Shell",5,1,0,"1 h","D"],["Arcane Hand",5,1,0,"1 min","SW"],
  ["Cloudkill",5,1,1,"10 min","SW"],["Conjure Elemental",5,1,0,"10 min","DW"],["Dispel Evil and Good",5,1,0,"1 min","CP"],["Dominate Person",5,1,0,"1 min",
  "BSW"],["Hold Monster",5,1,0,"1 min","BSKW"],["Insect Plague",5,1,1,"10 min","CDS"],["Telekinesis",5,1,0,"10 min","SW"],["Wall of Stone",5,1,1,"10 min",
  "DSW"],["Blade Barrier",6,1,1,"10 min","C"],["Eyebite",6,1,0,"1 min","BSKW"],["Flesh to Stone",6,1,0,"1 min","DSW"],["Globe of Invulnerability",6,1,0,"1 min",
  "SW"],["Irresistible Dance",6,1,0,"1 min","BW"],["True Seeing",6,0,0,"1 h","BCSKW"],["Wall of Ice",6,1,1,"10 min","W"],["Wall of Thorns",6,1,1,"10 min","D"],
  ["Etherealness",7,0,0,"8 h","BCSKW"],["Forcecage",7,1,1,"1 h","BKW"],["Regenerate",7,0,0,"1 h","BCD"],["Reverse Gravity",7,1,1,"1 min","DSW"],
  ["Antimagic Field",8,1,0,"1 h","CW"],["Dominate Monster",8,1,0,"1 h","BSKW"],["Holy Aura",8,1,0,"1 min","C"],["Incendiary Cloud",8,1,1,"1 min","DSW"],["Maze",
  8,1,0,"10 min","W"],["Mind Blank",8,0,0,"24 h","BW"],["Foresight",9,0,0,"8 h","BDKW"],["Shapechange",9,1,0,"1 h","DW"],["Storm of Vengeance",9,1,1,"1 min",
  "D"],["True Polymorph",9,1,0,"1 h","BKW"],["Weird",9,1,0,"1 min","KW"]];
/* class features players also like to show as an effect */
const FEAT_EFFECTS=[["Rage",-1,0,0,"10 min",""],["Bardic Inspiration",-1,0,0,"1 h","B"],["Wild Shape",-1,0,0,"","D"],["Innate Sorcery",-1,0,0,"1 min","S"],
  ["Sacred Weapon",-1,0,0,"10 min","P"],["Patient Defense",-1,0,0,"1 round",""]];
const SPELL_LIST=SRD_SPELLS.concat(FEAT_EFFECTS);
const SPELLS=Object.fromEntries(SPELL_LIST.map(x=>[x[0],!!x[2]]));
/* the full spell list from the DM's 5e.tools files (only spells: /spells is the one thing phones may read).
   Rows: [name, level, concentration, battlefield, duration, classes, book, source, group, older printing, ritual] */
let spRows=null,spByName=new Map(),spHb=ls.get("spHb",false),spTry=0;
const SRD_AREA=Object.fromEntries(SRD_SPELLS.map(x=>[x[0],x[3]]));
async function spLoad(){
  if(!served||meName==="*")return;
  try{const r=await fetch("/spells",{cache:"no-store"});
    if(r.status===503){if(++spTry<20)setTimeout(spLoad,5000);return}
    if(!r.ok)return;const d=await r.json();
    spRows=d.list.map(x=>{const a=x.slice();if(a[8]!=="hb"&&SRD_AREA[a[0]]!=null)a[3]=SRD_AREA[a[0]];
      return a});   // the app's own picks for "battlefield" where it has them
    spByName=new Map();spRows.forEach(x=>{const k=x[0].toLowerCase(),o=spByName.get(k);if(!o||(o[9]&&!x[9])||(o[8]==="hb"&&x[8]!=="hb"))spByName.set(k,x)});
    if(MODE==="player"){render();if(pSheet)renderPSheet()}   // the Spells tile appears
  }catch(e){if(++spTry<20)setTimeout(spLoad,5000)}
}
/* which rules this player's spells follow: 2024 (the newest printings) or 2014 (the old Player's Handbook printings, no 2024-only spells) */
const spDmgType=d=>{const it=d&&d.item;return it&&Array.isArray(it.damageInflict)&&it.damageInflict[0]||""};
const spEdKey=()=>"spEd:"+(meName||"").toLowerCase();
const sp14=()=>MODE==="player"&&ls.get(spEdKey(),"2024")==="2014";
const spCls=x=>sp14()&&x[11]!=null?x[11]:x[5];
/* a spell or class feature by name (and printing): the 5e.tools row when there is one, else the app's own list */
const spellFind=(n,src)=>{const k=String(n||"").trim().toLowerCase();
  if(spRows&&src){const r=spRows.find(x=>x[7]===src&&x[0].toLowerCase()===k);if(r)return r}
  if(spRows&&sp14()){const r=spRows.find(x=>x[0].toLowerCase()===k&&String(x[7]).toLowerCase()!=="xphb"&&x[8]!=="hb");if(r)return r}
  return spByName.get(k)||SPELL_LIST.find(x=>x[0].toLowerCase()===k)||null};
const durRounds=d=>d==="1 min"?10:(d.match(/^(\d+) rounds?$/)||[])[1]*1||0;   // effects the app counts down: a minute is 10 rounds
const spHbCount=()=>spRows?spRows.filter(x=>x[8]==="hb"&&!x[9]).length:0;
const spEdHtml=()=>spRows?`<div class="seg2 sped"><span class="psub">Rules</span>${["2024","2014"].map(v=>
  `<button type="button" data-act="psped" data-v="${v}" aria-pressed="${(sp14()?"2014":"2024")===v}">${v}</button>`).join("")}</div>`:"";
/* the pool a list shows: newest printings, the DM's own homebrew, other homebrew on request */
function spPool(effectsOnly){
  if(!spRows)return effectsOnly?SPELL_LIST:SRD_SPELLS;
  const old=sp14();   // 2014: the old printings stand in for their 2024 reprints, and 2024-only spells are left out
  const out=spRows.filter(x=>(old?String(x[7]).toLowerCase()!=="xphb":!x[9])&&(spHb||x[8]!=="hb")&&(!effectsOnly||x[4]!=="Instant"));
  return effectsOnly?out.concat(FEAT_EFFECTS):out;
}
const CLS_LETTER={bard:"B",cleric:"C",druid:"D",paladin:"P",ranger:"R",sorcerer:"S",warlock:"K",wizard:"W"};
const spellMeta=x=>[x[1]<0?"Class feature":x[1]===0?"Cantrip":"Level "+x[1],x[2]?"Concentration":"",x[4],x[3]?"battlefield":"",x[10]?"ritual":"",x[6]&&x[8]?
  srcName(x[6]):""].filter(Boolean).join(" · ");
/* resources with the way they come back (D&D 2024): long, short, shortOne = one on a short rest and all on a long rest, none */
const RES_GROUPS=[
  ["Everyone",null,[["Hit Dice","long","= your level"],["Heroic Inspiration","long","1"],["Spell slot 1","long",""],["Spell slot 2","long",""],["Spell slot 3",
    "long",""],["Spell slot 4","long",""],["Spell slot 5","long",""],["Spell slot 6","long",""],["Spell slot 7","long",""],["Spell slot 8","long",""],
    ["Spell slot 9","long",""],["Healing potions","none",""],["Item charges","long",""],["Arrows","none",""],["Bolts","none",""]]],
  ["Barbarian","barbarian",[["Rage","shortOne","2 at level 1, more as you level"],["Intimidating Presence","long","1 · Berserker"]]],
  ["Bard","bard",[["Bardic Inspiration","long","= CHA mod · short rest from level 5"]]],
  ["Cleric","cleric",[["Channel Divinity","shortOne","2 at level 2, 3 at 6, 4 at 18"],["Divine Intervention","long","1"]]],
  ["Druid","druid",[["Wild Shape","shortOne","2 at level 2, 3 at 6, 4 at 17"],["Wild Resurgence","long","1"],["Natural Recovery","long",
    "1 · Circle of the Land"]]],
  ["Fighter","fighter",[["Second Wind","shortOne","2 at level 1, 3 at 4, 4 at 10"],["Action Surge","short","1, 2 at level 17"],["Indomitable","long",
    "1 at level 9, 2 at 13, 3 at 17"],["Superiority Dice","short","4 · Battle Master"]]],
  ["Monk","monk",[["Focus Points","short","= Monk level"],["Uncanny Metabolism","long","1"],["Wholeness of Body","long","= WIS mod · Open Hand"]]],
  ["Paladin","paladin",[["Lay on Hands","long","5 × Paladin level"],["Channel Divinity","shortOne","2 at level 3, 3 at 11"],["Divine Smite (free)","long","1"],
    ["Find Steed (free)","long","1"],["Holy Nimbus","long","1 · Devotion"]]],
  ["Ranger","ranger",[["Hunter's Mark (free)","long","2 at level 1, more as you level"],["Tireless","long","= WIS mod"],["Nature's Veil","long","= WIS mod"]]],
  ["Rogue","rogue",[["Stroke of Luck","short","1"]]],
  ["Sorcerer","sorcerer",[["Sorcery Points","long","= Sorcerer level"],["Innate Sorcery","long","2"],["Sorcerous Restoration","long","1"]]],
  ["Warlock","warlock",[["Pact slots","short","1 at level 1, 2 at 2, 3 at 11, 4 at 17"],["Magical Cunning","long","1"],["Contact Patron","long","1"],
    ["Dark One's Own Luck","long","= CHA mod · Fiend"],["Hurl Through Hell","long","1 · Fiend"],["Mystic Arcanum 6","long","1"],["Mystic Arcanum 7","long","1"],
    ["Mystic Arcanum 8","long","1"],["Mystic Arcanum 9","long","1"]]],
  ["Wizard","wizard",[["Arcane Recovery","long","1"],["Signature Spells","short","2"],["Overchannel","long","1 · Evoker"]]],
  ["Species and feats",null,[["Luck Points","long","= proficiency bonus · Lucky"],["Breath Weapon","long","= proficiency bonus · Dragonborn"],
    ["Adrenaline Rush","short","= proficiency bonus · Orc"],["Giant Ancestry","long","= proficiency bonus · Goliath"],["Large Form","long","1 · Goliath"],
    ["Celestial Revelation","long","1 · Aasimar"],["Healing Hands","long","1 · Aasimar"],["Stonecunning","long","= proficiency bonus · Dwarf"],
    ["Fiendish Legacy spell","long","1 · Tiefling"]]]];
const RES_PRESETS=Object.fromEntries(RES_GROUPS.flatMap(g=>g[2].map(r=>[r[0],r[1]])));
const RES_HINT=Object.fromEntries(RES_GROUPS.flatMap(g=>g[2].map(r=>[r[0],r[2]])));
const RESET_LABEL={long:"long rest",short:"short rest",shortOne:"1 per short rest, all on long",none:"doesn't recover"};

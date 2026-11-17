(() => {
  'use strict';
  const PARTS = {"girlBody":{"rect":[3,3,175,175],"size":[256,256]},"blueBody":{"rect":[181,3,163,163],"size":[256,256]},"greenBody":{"rect":[347,3,150,150],"size":[256,256]},"girlCloth":{"rect":[3,181,33,72],"size":[36,112]},"blueCloth":{"rect":[39,181,31,67],"size":[36,112]},"greenCloth":{"rect":[73,181,28,62],"size":[36,112]},"girlFree":{"rect":[104,181,29,33],"size":[64,74],"anchor":[38.44444444444444,66.65079365079364],"scale":0.65},"blueLeft":{"rect":[136,181,25,31],"size":[61,76],"anchor":[18.08677235256817,72.93077996195308],"scale":0.65},"blueRight":{"rect":[164,181,26,31],"size":[62,76],"anchor":[42.98989934663606,72.8576019777503],"scale":0.65},"greenLeft":{"rect":[193,181,23,25],"size":[45,50],"anchor":[11.140720162410513,10.18898030416355],"scale":0.9},"greenRight":{"rect":[219,181,22,25],"size":[44,50],"anchor":[7.850314525352649,11.096216164696912],"scale":0.9},"girlSupport":{"rect":[244,181,26,14],"size":[58,30],"anchor":[46.64975205488758,15.776102166972352],"scale":0.65},"girlClosed0":{"rect":[273,181,17,13],"size":[24,18],"target":[118.9800086448538,65.68995523107696]},"girlClosed1":{"rect":[293,181,17,13],"size":[24,18],"target":[141.4611402103692,65.34306465134432]},"blueClosed0":{"rect":[313,181,16,12],"size":[24,18],"target":[117.16137745080543,54.07694601686126]},"blueClosed1":{"rect":[332,181,16,12],"size":[24,18],"target":[139.8434177105643,53.99782446779803]},"blueLeft0":{"rect":[351,181,16,12],"size":[24,18],"target":[117.16137745080543,54.07694601686126]},"blueLeft1":{"rect":[370,181,16,12],"size":[24,18],"target":[139.8434177105643,53.99782446779803]},"blueRight0":{"rect":[389,181,16,12],"size":[24,18],"target":[117.16137745080543,54.07694601686126]},"blueRight1":{"rect":[408,181,16,12],"size":[24,18],"target":[139.8434177105643,53.99782446779803]},"greenClosed0":{"rect":[427,181,14,11],"size":[24,18],"target":[115.30055893996513,64.3290305312183]},"greenClosed1":{"rect":[444,181,14,11],"size":[24,18],"target":[138.7385481554705,64.22257775016836]},"greenDown0":{"rect":[461,181,14,11],"size":[24,18],"target":[115.30055893996513,64.3290305312183]},"greenDown1":{"rect":[478,181,14,11],"size":[24,18],"target":[138.7385481554705,64.22257775016836]}};
  const CYCLE=16, LEDGE=214, PAD=16, MOTION_SPEED=1.15;
  const PEEK_VISIBLE=.8;
  const DAY=[
    {name:'girl',action:'greeting',enter:1.65,activity:2.85,rest:.8,leave:1.55,size:180,mobileSize:114},
    {name:'blue',action:'peering',enter:1.6,activity:3.8,rest:.9,leave:1.6,size:168,mobileSize:114},
    {name:'green',action:'warming',enter:1.7,activity:3.3,rest:.7,leave:1.6,size:154,mobileSize:110}
  ].map(person=>({...person,delay:.65,x:215,mobileX:215}));
  const NIGHT=[
    {name:'blue',action:'peering',delay:.45,enter:1.6,activity:3.8,rest:.9,leave:1.6,x:246,size:168,mobileX:250,mobileSize:114},
    {name:'green',action:'warming',delay:1.9,enter:1.7,activity:3.3,rest:.7,leave:1.6,x:518,size:154,mobileX:524,mobileSize:110},
    {name:'girl',action:'greeting',delay:1.1,enter:1.7,activity:2.85,rest:1,leave:1.55,x:422,size:168,mobileX:430,mobileSize:116}
  ];
  function chooseDayVisitor(previous){
    const choices=DAY.filter(person=>person!==previous);
    return choices[Math.floor(Math.random()*choices.length)];
  }
  const clamp=x=>Math.max(0,Math.min(1,x));
  const ease=x=>{const t=clamp(x);return t*t*t*(t*(t*6-15)+10);};
  const mix=(a,b,t)=>a+(b-a)*t;
  const envelope=(t,start,end,attack,release)=>ease((t-start)/attack)*(1-ease((t-(end-release))/release));

  function poseAt(person,clock,reduced) {
    if(reduced)return{phase:person.action,reveal:1,actionTime:person.name==='girl'?1:person.name==='blue'?1.5:1.3,time:0,still:true};
    let t=clock%CYCLE-person.delay;
    if(t<0)return null;
    const time=t;
    if(t<person.enter)return{phase:'peeking',reveal:ease(t/person.enter),actionTime:-1,time};
    t-=person.enter;
    if(t<person.activity)return{phase:person.action,reveal:1,actionTime:t,time};
    t-=person.activity;
    if(t<person.rest)return{phase:'resting',reveal:1,actionTime:person.activity,time};
    t-=person.rest;
    if(t<person.leave)return{phase:'ducking',reveal:1-ease(t/person.leave),actionTime:person.activity,time};
    return null;
  }

  // Elbows have authored, continuous arcs. Solving each frame by choosing the
  // outer IK solution would flip the elbow when the wrist crosses a shoulder.
  function joints(name,pose) {
    const rise=(1-pose.reveal)*228;
    const breath=pose.still?0:Math.sin(pose.time*2.3)*.32*pose.reveal;
    const root=rise+breath;
    const a=pose.actionTime;
    let lift=0,wave=0,rub=0;
    if(name==='girl') {
      const entry=.3*ease((pose.reveal-.28)/.72);
      lift=pose.phase==='peeking'?entry:pose.phase==='ducking'?0:
        mix(.3,1,ease(a/.55))*(1-ease((a-1.95)/.8));
      const waveWeight=pose.still?0:envelope(a,.35,2.25,.3,.4);
      wave=waveWeight*Math.sin((a-.35)*Math.PI*3.8);
    } else if(name==='blue') {
      lift=pose.phase==='peeking'?.12*ease((pose.reveal-.5)/.5):
        pose.phase==='ducking'?0:mix(.12,1,ease(a/.65))*(1-ease((a-2.8)/1));
    } else {
      lift=pose.phase==='peeking'?.1*ease((pose.reveal-.5)/.5):
        pose.phase==='ducking'?0:mix(.1,1,ease(a/.65))*(1-ease((a-2.45)/.85));
      rub=pose.still?0:envelope(a,.55,2.5,.3,.35)*Math.sin((a-.55)*Math.PI*3.4);
    }
    const restingWrist=220+Math.max(0,root-76);
    const left={s:[88,128+root],e:[65,173+root*.72],p:[76,restingWrist]};
    const right={s:[170,128+root],e:[191,173+root*.72],p:[181,restingWrist]};
    if(name==='girl') {
      left.e=[mix(65,54,lift)-Math.sin(lift*Math.PI)*18,mix(173+root*.72,160+root,lift)];
      left.p=[mix(76,72+wave*1.6,lift)-Math.sin(lift*Math.PI)*2,
        mix(restingWrist,117+root+wave*.7,lift)];
      right.e=[190,171+root*.72];
      right.p=[180,209+Math.max(0,root-76)];
    } else if(name==='blue') {
      left.e=[mix(65,49,lift)-Math.sin(lift*Math.PI)*18,mix(173+root*.72,120+root,lift)];
      right.e=[mix(191,207,lift)+Math.sin(lift*Math.PI)*18,mix(173+root*.72,120+root,lift)];
      const arc=Math.sin(lift*Math.PI)*8;
      left.p=[mix(76,79,lift)-arc,mix(restingWrist,79+root,lift)];
      right.p=[mix(181,177,lift)+arc,mix(restingWrist,79+root,lift)];
    } else {
      left.e=[mix(65,77,lift)-Math.sin(lift*Math.PI)*6,mix(173+root*.72,181+root,lift)];
      right.e=[mix(191,181,lift)+Math.sin(lift*Math.PI)*6,mix(173+root*.72,184+root,lift)];
      left.p=[mix(76,109+rub*1.2,lift),mix(restingWrist,167+root+rub*3,lift)];
      right.p=[mix(181,146-rub*1.2,lift),mix(restingWrist,169+root-rub*3,lift)];
    }
    // A mitten continues the forearm at the wrist. Its source drawing has a
    // different local direction for each hand; account for that before adding
    // a small, deliberate flex for the greeting or the hand-warming action.
    const axis=name==='girl'?[-1.95,Math.PI]:name==='blue'?[-1.27,-1.85]:[1.25,1.27];
    left.angle=Math.atan2(left.p[1]-left.e[1],left.p[0]-left.e[0])-axis[0];
    right.angle=Math.atan2(right.p[1]-right.e[1],right.p[0]-right.e[0])-axis[1];
    if(name==='girl')left.angle+=lift*(-.18+wave*.27);
    if(name==='blue'){left.angle-=lift*.32;right.angle+=lift*.32;}
    if(name==='green'){
      left.angle-=lift*.52-rub*.045;
      right.angle+=lift*.08-rub*.045;
    }
    return{root,left,right};
  }

  window.createWindowVisitors=canvas=>{
    if(!window.OKLOGIN_SETTINGS.effects.windowVisitors){
      if(canvas)canvas.style.display='none';
      return()=>{};
    }
    const context=canvas?.getContext('2d',{alpha:true});
    if(!context)return()=>{};
    const compact=window.matchMedia('(max-width:850px)'),motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    const clocks={day:0,night:0},unlocked={day:true,night:false},buffers={},sleeves={};
    let atlas,ready=false,visible=true,night=0,mode='day',handle=0,previous=null;
    let logicalHeight=600,rasterRatio=0,lastSignature='',dayVisitor=chooseDayVisitor();

    for(const scene of ['day','night'])for(const person of scene==='day'?DAY:NIGHT){
      const surface=document.createElement('canvas');surface.width=256+PAD*2;surface.height=256+PAD*2;
      buffers[scene+person.name]={surface,context:surface.getContext('2d',{alpha:true})};
    }
    function part(brush,name,x,y,opacity=1){
      if(opacity<=0)return;
      const p=PARTS[name],r=p.rect;brush.globalAlpha=opacity;
      brush.drawImage(atlas,...r,x,y,...p.size);brush.globalAlpha=1;
    }
    function sleeve(brush,arm,image,front){
      const {s,e,p}=arm,upper=Math.hypot(e[0]-s[0],e[1]-s[1]),lower=Math.hypot(p[0]-e[0],p[1]-e[1]);
      const radius=Math.min(16,upper*.34,lower*.34),a=[e[0]+(s[0]-e[0])*radius/upper,e[1]+(s[1]-e[1])*radius/upper],b=[e[0]+(p[0]-e[0])*radius/lower,e[1]+(p[1]-e[1])*radius/lower];
      const points=[];
      function add(q,dx,dy,u){const length=Math.hypot(dx,dy)||1,width=mix(34,23,u)+Math.sin(u*Math.PI)*1.3;points.push({q,n:[-dy/length,dx/length],width});}
      const total=upper+lower;
      for(let i=0;i<=6;i++){const t=i/6;add([mix(s[0],a[0],t),mix(s[1],a[1],t)],e[0]-s[0],e[1]-s[1],t*(upper-radius)/total);}
      for(let i=1;i<=12;i++){const t=i/12;add([(1-t)**2*a[0]+2*(1-t)*t*e[0]+t*t*b[0],(1-t)**2*a[1]+2*(1-t)*t*e[1]+t*t*b[1]],2*(1-t)*(e[0]-a[0])+2*t*(b[0]-e[0]),2*(1-t)*(e[1]-a[1])+2*t*(b[1]-e[1]),(upper-radius+radius*2*t)/total);}
      for(let i=1;i<=7;i++){const t=i/7;add([mix(b[0],p[0],t),mix(b[1],p[1],t)],p[0]-e[0],p[1]-e[1],(upper+radius+(lower-radius)*t)/total);}
      let distance=0;for(let i=0;i<points.length;i++){if(i)distance+=Math.hypot(points[i].q[0]-points[i-1].q[0],points[i].q[1]-points[i-1].q[1]);points[i].distance=distance;}
      const outline=front?points.slice(6):points;
      const left=outline.map(v=>[v.q[0]+v.n[0]*v.width/2,v.q[1]+v.n[1]*v.width/2]),right=outline.map(v=>[v.q[0]-v.n[0]*v.width/2,v.q[1]-v.n[1]*v.width/2]);
      function edge(values){
        for(let i=0;i<values.length-1;i++){
          const a=values[Math.max(0,i-1)],b=values[i],c=values[i+1],d=values[Math.min(values.length-1,i+2)];
          brush.bezierCurveTo(b[0]+(c[0]-a[0])/6,b[1]+(c[1]-a[1])/6,c[0]-(d[0]-b[0])/6,c[1]-(d[1]-b[1])/6,...c);
        }
      }
      brush.save();brush.beginPath();brush.moveTo(...left[0]);edge(left);
      const last=outline[outline.length-1],endLeft=left[left.length-1],endRight=right[right.length-1];
      const tangent=[last.n[1],-last.n[0]];
      brush.bezierCurveTo(endLeft[0]+tangent[0]*3,endLeft[1]+tangent[1]*3,endRight[0]+tangent[0]*3,endRight[1]+tangent[1]*3,...endRight);
      edge([...right].reverse());
      const first=outline[0],cap=first.width*.68,t0=[first.n[1],-first.n[0]];
      brush.bezierCurveTo(right[0][0]-t0[0]*cap,right[0][1]-t0[1]*cap,left[0][0]-t0[0]*cap,left[0][1]-t0[1]*cap,...left[0]);
      brush.closePath();brush.clip();
      const bounds=[...left,...right,[first.q[0]-t0[0]*cap,first.q[1]-t0[1]*cap]];
      const x0=Math.min(...bounds.map(q=>q[0]))-3,y0=Math.min(...bounds.map(q=>q[1]))-3;
      const x1=Math.max(...bounds.map(q=>q[0]))+3,y1=Math.max(...bounds.map(q=>q[1]))+3;
      brush.drawImage(image,4,0,image.width-8,image.height,x0,y0,x1-x0,y1-y0);
      const texturePoints=[0,3,6,8,10,12,14,16,18,21,25].map(i=>points[i]).filter(q=>!front||q.distance>=outline[0].distance);
      for(let i=0;i<texturePoints.length-1;i++){
        const from=texturePoints[i],to=texturePoints[i+1],dx=to.q[0]-from.q[0],dy=to.q[1]-from.q[1],length=Math.hypot(dx,dy),width=Math.max(from.width,to.width)+3;
        const sy=from.distance/distance*image.height,sh=Math.max(.2,(to.distance-from.distance)/distance*image.height);
        brush.save();brush.translate(...from.q);brush.rotate(Math.atan2(dy,dx)-Math.PI/2);
        if(i===0)brush.drawImage(image,4,sy,image.width-8,Math.min(8,image.height-sy),-width/2,-first.width*.68,width,first.width*.68+3);
        brush.drawImage(image,4,sy,image.width-8,Math.min(image.height-sy,sh+.25),-width/2,-2.5,width,length+5);
        brush.restore();
      }
      brush.restore();
    }
    function mitten(brush,name,arm){
      const p=PARTS[name],fit=name.startsWith('green')?.95:name.startsWith('blue')?.98:1;
      brush.save();brush.translate(...arm.p);brush.rotate(arm.angle);brush.scale(p.scale*fit,p.scale*fit);
      part(brush,name,-p.anchor[0],-p.anchor[1]);brush.restore();
    }
    function eyes(brush,name,pose,root){
      const t=pose.actionTime;
      function patches(state,weight){
        if(weight<=.001)return;
        for(let i=0;i<2;i++){
          const key=name+state+i,p=PARTS[key];if(!p)continue;
          part(brush,key,p.target[0]-p.size[0]/2,p.target[1]+root-p.size[1]/2,weight);
        }
      }
      if(name==='blue'){
        patches('Left',envelope(t,.7,1.75,.23,.23));
        patches('Right',envelope(t,2.05,2.85,.22,.22));
      }
      if(name==='green')patches('Down',envelope(t,.55,1.7,.3,.3)*.85);
      if(!pose.still){
        const blinkAt=name==='girl'?1.3:name==='blue'?1.85:2.15;
        const blink=envelope(t,blinkAt,blinkAt+.19,.072,.09);
        patches('Closed',blink);
      }
    }
    function rasterPose(scene,person,pose){
      const buffer=buffers[scene+person.name],brush=buffer.context;
      if(!brush)return null;
      const name=person.name,arms=joints(name,pose),cloth=sleeves[name];
      brush.setTransform(1,0,0,1,0,0);brush.globalAlpha=1;brush.clearRect(0,0,buffer.surface.width,buffer.surface.height);
      brush.save();brush.translate(PAD,PAD);brush.beginPath();brush.rect(-PAD,-PAD,256+PAD*2,LEDGE+PAD);brush.clip();
      brush.imageSmoothingEnabled=true;brush.imageSmoothingQuality='high';
      for(const arm of[arms.left,arms.right])sleeve(brush,arm,cloth,false);
      part(brush,name+'Body',0,arms.root);
      eyes(brush,name,pose,arms.root);
      if(name==='green')for(const arm of[arms.left,arms.right])sleeve(brush,arm,cloth,true);
      mitten(brush,name==='girl'?'girlSupport':name+'Right',arms.right);
      mitten(brush,name==='girl'?'girlFree':name+'Left',arms.left);
      brush.restore();return buffer.surface;
    }
    function paint(){
      if(!ready)return;
      const draws=[];
      for(const[scene,roster,opacity]of[['day',[dayVisitor],1-night],['night',NIGHT,night]]){
        if(!unlocked[scene]||opacity<=.001)continue;
        for(const person of roster){const pose=poseAt(person,clocks[scene],motion.matches);if(pose)draws.push({scene,person,pose,opacity});}
      }
      const signature=logicalHeight+':'+night+':'+draws.map(d=>d.scene+d.person.name+d.pose.time+':'+d.pose.phase+':'+d.pose.still).join(',');
      if(signature===lastSignature)return;lastSignature=signature;
      for(const draw of draws)draw.raster=rasterPose(draw.scene,draw.person,draw.pose);
      context.clearRect(0,0,680,logicalHeight);
      const bottom=compact.matches?288:528;
      context.save();context.beginPath();context.rect(103,53,474,bottom-53);context.clip();
      context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
      for(const{person,opacity,raster}of draws){
        if(!raster)continue;
        const size=compact.matches?person.mobileSize:person.size,x=compact.matches?person.mobileX:person.x,scale=size/LEDGE;
        context.globalAlpha=opacity;
        context.drawImage(raster,x-(128+PAD)*scale,bottom-(LEDGE*PEEK_VISIBLE+PAD)*scale,bufferWidth()*scale,bufferWidth()*scale);
      }
      context.restore();
    }
    function bufferWidth(){return 256+PAD*2;}
    function schedule(){if(ready&&visible&&!handle&&!document.hidden&&!window.popupMotion.active&&!motion.matches)handle=requestAnimationFrame(tick);}
    function stop(){if(handle)cancelAnimationFrame(handle);handle=0;previous=null;}
    function tick(timestamp){
      handle=0;
      const dt=previous===null?0:Math.max(0,Math.min((timestamp-previous)/1000,.05));previous=timestamp;
      if(unlocked.day&&night<.999){
        const next=clocks.day+dt*MOTION_SPEED;
        if(next>=CYCLE)dayVisitor=chooseDayVisitor(dayVisitor);
        clocks.day=next%CYCLE;
      }
      if(unlocked.night&&night>.001)clocks.night=(clocks.night+dt*MOTION_SPEED)%CYCLE;
      paint();schedule();
    }
    function resize(){
      const h=compact.matches?360:600,r=Math.min(window.devicePixelRatio||1,2),w=Math.round(680*r),height=Math.round(h*r);
      if(logicalHeight===h&&rasterRatio===r&&canvas.width===w&&canvas.height===height)return;
      logicalHeight=h;rasterRatio=r;
      if(canvas.width!==w)canvas.width=w;if(canvas.height!==height)canvas.height=height;
      context.setTransform(r,0,0,r,0,0);lastSignature='';paint();
    }
    function setNight(level){
      const value=Number(level);night=Number.isFinite(value)?clamp(value):0;
      const next=night>=.65?'night':night<=.35?'day':mode;
      if(next!==mode){
        mode=next;
        if(!unlocked[mode]){
          clocks[mode]=0;unlocked[mode]=true;
          if(mode==='day')dayVisitor=chooseDayVisitor(dayVisitor);
        }
        lastSignature='';
      }
      if(night<=.001){unlocked.night=false;clocks.night=0;}
      if(night>=.999){unlocked.day=false;clocks.day=0;}
      paint();schedule();
    }
    window.popupMotion.subscribe(()=>{stop();if(!window.popupMotion.active){paint();schedule();}});
    motion.addEventListener('change',()=>{stop();lastSignature='';paint();schedule();});
    compact.addEventListener('change',resize);window.addEventListener('resize',resize);
    document.addEventListener('visibilitychange',()=>{stop();if(!document.hidden){lastSignature='';paint();schedule();}});
    if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)stop();else{paint();schedule();}}).observe(canvas.parentElement);
    resize();
    const picture=new Image();picture.decoding='async';picture.src='image/window-visitors-rig.png?v=fit-150-1';
    picture.decode().then(()=>{
      atlas=picture;
      for(const name of['girl','blue','green']){
        const {rect:r,size}=PARTS[name+'Cloth'],s=document.createElement('canvas');s.width=size[0];s.height=size[1];
        s.getContext('2d',{alpha:true}).drawImage(atlas,...r,0,0,...size);sleeves[name]=s;
      }
      ready=true;lastSignature='';paint();schedule();
    }).catch(error=>{console.error('Không tải được nhân vật bên cửa sổ.',error);});
    return setNight;
  };
})();

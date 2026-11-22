import {useEffect,useRef,useState} from 'react';
export default function AuthVideo() {
 const video=useRef(null);
 const [reduced,setReduced]=useState(()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{
  const query=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const change=()=>setReduced(!!query?.matches);
  query?.addEventListener?.('change',change);
  return ()=>query?.removeEventListener?.('change',change);
 },[]);
 useEffect(()=>{
  const player=video.current;
  if(reduced) player.pause(); else player.play()?.catch(()=>{});
  return ()=>player.pause();
 },[reduced]);
 return <div className="auth-video" aria-hidden="true"><video ref={video} src={`${import.meta.env.BASE_URL}media/career-hero.mp4`} muted loop playsInline autoPlay={!reduced} preload="metadata" tabIndex={-1} onError={e=>{e.currentTarget.hidden=true;}} /></div>;
}

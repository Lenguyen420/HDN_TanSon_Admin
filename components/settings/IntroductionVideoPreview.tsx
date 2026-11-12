"use client";
export default function IntroductionVideoPreview({url}:{url:string}) {
  if (!url.trim()) return null;
  let parsed:URL;
  try { parsed=new URL(url.trim());if(parsed.protocol!=="https:"||parsed.username||parsed.password)return null; } catch{return null;}
  const host=parsed.hostname.toLowerCase();
  const youtube=["youtube.com","www.youtube.com","m.youtube.com","youtu.be","www.youtube-nocookie.com"].includes(host);
  const id=host==="youtu.be"?parsed.pathname.split("/")[1]:parsed.searchParams.get("v")||parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
  if(youtube&&(!id||!/^[\w-]{11}$/.test(id)))return <small>Link YouTube chưa hợp lệ.</small>;
  return <span style={{display:"block",width:"100%",maxWidth:560,aspectRatio:"16 / 9",overflow:"hidden",borderRadius:12,background:"#102337",marginTop:12}}>{youtube?<iframe src={"https://www.youtube-nocookie.com/embed/"+id} title="Xem trước video giới thiệu Hội" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" style={{width:"100%",height:"100%",border:0}}/>:<video src={parsed.href} controls playsInline preload="none" style={{display:"block",width:"100%",height:"100%"}}/>}</span>;
}

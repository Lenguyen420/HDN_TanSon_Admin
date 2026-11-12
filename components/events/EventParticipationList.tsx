"use client";
import { useEffect, useState } from "react";
import api from "@/services/api/axiosConfig";
interface Participant {id:string;name:string;company:string;registeredAt:string|null;checkedAt:string|null;status:"registered"|"attended"|"absent";}
export default function EventParticipationList({eventId}:{eventId:string}) {
  const [items,setItems]=useState<Participant[]>([]);
  const [page,setPage]=useState(1);
  const [total,setTotal]=useState(0);
  const [error,setError]=useState("");
  useEffect(()=>{
    let active=true,busy=false;const controller=new AbortController();
    const refresh=async()=>{if(busy||document.visibilityState==="hidden")return;busy=true;try{const {data}=await api.get<{data:Participant[];pagination:{total:number}}>("/association/events/"+encodeURIComponent(eventId)+"/attendance?page="+page+"&limit=50",{signal:controller.signal});if(active){setItems(data.data);setTotal(data.pagination.total);setError("");}}catch{if(active)setError("Chưa tải được danh sách tham gia. Hệ thống sẽ tự thử lại.");}finally{busy=false;}};
    void refresh();const timer=window.setInterval(()=>void refresh(),5000);
    return()=>{active=false;controller.abort();window.clearInterval(timer);};
  },[eventId,page]);
  const labels={registered:"Đã đăng ký",attended:"Đã điểm danh",absent:"Vắng mặt"};
  return <section aria-label="Người tham gia sự kiện"><h3>Đăng ký và điểm danh ({total})</h3>{error&&<p role="status">{error}</p>}<div style={{overflowX:"auto"}}><table><thead><tr><th>Họ tên</th><th>Đơn vị</th><th>Trạng thái</th><th>Điểm danh</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td>{item.name}</td><td>{item.company||"—"}</td><td>{labels[item.status]}</td><td>{item.checkedAt?new Date(item.checkedAt).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"}):"—"}</td></tr>)}</tbody></table></div>{!items.length&&!error&&<p>Chưa có người đăng ký hoặc điểm danh.</p>}<div><button type="button" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Trang trước</button><span> Trang {page} </span><button type="button" disabled={page*50>=total} onClick={()=>setPage(p=>p+1)}>Trang sau</button></div></section>;
}

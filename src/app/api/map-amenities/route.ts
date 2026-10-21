import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
type Amenity = { id: string; name: string; category: string; address: string; lat: number; lng: number; createdAt: string };
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) { const rad=(v:number)=>v*Math.PI/180; const dLat=rad(lat2-lat1), dLng=rad(lng2-lng1); const a=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLng/2)**2; return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); }
export async function GET(request: NextRequest) {
 const lat=Number(request.nextUrl.searchParams.get("lat")), lng=Number(request.nextUrl.searchParams.get("lng"));
 const radiusKm=Math.max(.25,Math.min(5,(Number(request.nextUrl.searchParams.get("radius"))||5000)/1000));
 if (!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lng)||Math.abs(lng)>180) return NextResponse.json({places:[]},{status:400,headers:{"Cache-Control":"no-store"}});
 try {
  const row=await prisma.siteSetting.findUnique({where:{key:"manual_map_amenities_v1"},select:{value:true}});
  const parsed=row?JSON.parse(row.value):[]; const saved:Amenity[]=Array.isArray(parsed)?parsed:[];
  const places=saved.map(place=>({...place,distanceKm:distanceKm(lat,lng,place.lat,place.lng),source:"NyumbaFinder"})).filter(place=>Number.isFinite(place.distanceKm)&&place.distanceKm<=radiusKm).sort((a,b)=>a.distanceKm-b.distanceKm);
  return NextResponse.json({places},{headers:{"Cache-Control":"no-store, max-age=0, must-revalidate"}});
 } catch { return NextResponse.json({places:[]},{headers:{"Cache-Control":"no-store"}}); }
}

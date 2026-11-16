/* Sambungan Supabase untuk situs Nurut Tauhid. Dimuat SETELAH script utama di index.html. */
(()=>{
const API="https://szlagglkvrrsdmpyjlpx.supabase.co",KEY="sb_publishable_7nOBvjoCIZomg4YbuqRF_Q_vYQhOkAf";
const KS=["reg","ber","don","mau","rek","gal","vid","tes"],PK=["ber","gal","vid","tes"];
let tok=null,rt=null,exp=0,setId=null,sd=0,busy=0,again=0,tm,base={};

const hd=()=>{const h={apikey:KEY,"Content-Type":"application/json"};if(tok)h.Authorization="Bearer "+tok;return h};
function keep(j){tok=j.access_token;rt=j.refresh_token;exp=j.expires_at||0;const e=(j.user&&j.user.email)||"admin";user={u:e,role:"Administrator",nama:e};role="Administrator";NAME.Administrator=e.split("@")[0];localStorage.setItem("sbs",JSON.stringify({rt}))}
async function auth(body,gt){const r=await fetch(API+"/auth/v1/token?grant_type="+gt,{method:"POST",headers:{apikey:KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});if(!r.ok)return 0;keep(await r.json());return 1}
async function live(){if(tok&&exp&&Date.now()/1000>exp-60&&!await auth({refresh_token:rt},"refresh_token"))tok=null}
async function rq(m,p,b,x){await live();return fetch(API+p,{method:m,headers:{...hd(),...x},body:b?JSON.stringify(b):undefined})}

/* Ambil data dari Supabase */
async function pull(){
 const r=await rq("GET","/rest/v1/items?select=id,kind,data&order=id.asc");
 if(!r.ok)return;
 const rows=await r.json(),set=rows.find(x=>x.kind=="set");
 if(set){setId=set.id;Object.assign(S,set.data)}
 (tok?KS:PK).forEach(k=>{
  const l=rows.filter(x=>x.kind==k);base[k]={};
  if(set||l.length)D[k]=l.map(x=>{const a=Array.isArray(x.data.r)?x.data.r:[];a.id=x.id;base[k][x.id]=JSON.stringify(a);return a});
 });
}

/* Kirim perubahan ke Supabase */
async function sync(){
 if(busy){again=1;return}busy=1;
 try{
  await live();
  for(const k of tok?KS:["reg"]){
   const cur=D[k]||[],b=base[k]=base[k]||{},ids={};
   for(const r of cur){
    const s=JSON.stringify(r);
    if(r.id){ids[r.id]=1;if(b[r.id]!==s){const x=await rq("PATCH","/rest/v1/items?id=eq."+r.id,{data:{r}});if(x.ok)b[r.id]=s}}
    else if(tok){const x=await rq("POST","/rest/v1/items?select=id",{kind:k,data:{r}},{Prefer:"return=representation"});if(x.ok){r.id=(await x.json())[0].id;b[r.id]=s;ids[r.id]=1}}
    else if(!r.sent){const x=await rq("POST","/rest/v1/items",{kind:k,data:{r}},{Prefer:"return=minimal"});if(x.ok)r.sent=1}
   }
   if(tok)for(const id in b)if(!ids[id]){const x=await rq("DELETE","/rest/v1/items?id=eq."+id);if(x.ok)delete b[id]}
  }
  if(tok&&(sd||!setId)){
   const x=await rq(setId?"PATCH":"POST","/rest/v1/items"+(setId?"?id=eq."+setId:"?select=id"),{kind:"set",data:S},setId?{}:{Prefer:"return=representation"});
   if(x.ok){sd=0;if(!setId)setId=(await x.json())[0].id}
  }
 }catch(e){console.error(e)}
 busy=0;if(again){again=0;sync()}
}

/* Setiap data disimpan ke localStorage, otomatis kirim ke Supabase */
const si=Storage.prototype.setItem;
Storage.prototype.setItem=function(k,v){try{si.call(this,k,v)}finally{if(this===localStorage&&(k=="pkd"||k=="pk")){if(k=="pk")sd=1;clearTimeout(tm);tm=setTimeout(sync,500)}}};

/* Upload foto galeri */
function shrink(f,w){return new Promise((res,rej)=>{const im=new Image,u=URL.createObjectURL(f);im.onload=()=>{const k=Math.min(1,w/im.width),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);c.toBlob(b=>b?res(b):rej(),"image/jpeg",.82)};im.onerror=rej;im.src=u})}
async function up(f){
 await live();if(!tok)throw 401;
 const b=await shrink(f,1200),p="gal/"+Date.now()+".jpg";
 const r=await fetch(API+"/storage/v1/object/media/"+p,{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+tok,"Content-Type":"image/jpeg"},body:b});
 if(!r.ok)throw r.status;
 return API+"/storage/v1/object/public/media/"+p;
}
const _add=add;
add=async function(k,f,msg){
 if(k!="gal")return _add(k,f,msg);
 const v=fv(f),fi=$(f+" input[type=file]"),file=fi&&fi.files[0];
 if(!v[0])return bad("Judul wajib diisi");
 if(!file)return bad("Pilih foto dulu");
 if(!/^image\//.test(file.type))return bad("File harus berupa gambar");
 if(!tok)return bad("Sesi habis, silakan login ulang");
 const bt=document.activeElement;if(bt&&bt.tagName=="BUTTON"){bt.textContent="Mengunggah...";bt.disabled=true}
 try{const u=await up(file);D.gal.push([v[0],v[1],u]);ok(msg)}
 catch(e){if(bt){bt.disabled=false;bt.textContent="Simpan Dokumentasi"}bad("Upload gagal. Cek koneksi atau login ulang")}
};
window.addGal=()=>add("gal","#fg","Dokumentasi tersimpan");

/* Tampilkan foto di kartu galeri */
function post(){
 if(R=="gfotop"||R=="gfoto")document.querySelectorAll(".th").forEach((el,i)=>{
  const g=D.gal[i];
  if(g&&/^(https?:|data:image)/.test(g[2]||"")){el.style.backgroundImage="url("+JSON.stringify(g[2])+")";el.style.backgroundSize="cover";el.style.backgroundPosition="center"}
 });
 const lu=$("#lu");if(lu)lu.placeholder="Email admin";
}
const g0=go;go=function(){g0();post()};
addEventListener("hashchange",post);

/* Login lewat Supabase Auth */
login=async function(){
 const e=$("#le"),u=$("#lu").value.trim(),p=$("#lp").value;
 if(!u||!p){e.textContent="Isi email dan password.";return}
 e.textContent="Memeriksa...";
 if(!await auth({email:u,password:p},"password")){e.textContent="Email atau password salah.";return}
 location.hash="#dashboard";await pull();go();sync();
};
const lo=logout;
logout=function(){tok=null;rt=null;localStorage.removeItem("sbs");lo();setTimeout(()=>location.reload(),2000)};

/* Mulai */
(async()=>{
 try{const s=JSON.parse(localStorage.getItem("sbs")||"null");if(s&&s.rt)await auth({refresh_token:s.rt},"refresh_token")}catch(e){}
 if(!tok)D.reg.forEach(r=>r.sent=1);
 await pull();go();if(tok)sync();
})();
})();

const express = require("express")
const http = require("http")
const { Server } = require("socket.io")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.json())

const PASSWORD = "2486"
const SESSION_TIME = 30*60*1000

let devices={}

app.get("/",(req,res)=>{

res.send(`

<!DOCTYPE html>
<html>
<head>

<title>GPS Tracker</title>

<link rel="stylesheet"
href="https://unpkg.com/leaflet/dist/leaflet.css"/>

<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script src="/socket.io/socket.io.js"></script>

<style>

body{margin:0;font-family:sans-serif;}

#login{
position:absolute;
width:100%;
height:100%;
display:flex;
justify-content:center;
align-items:center;
flex-direction:column;
background:#f2f2f2;
}

#app{display:none;width:100%;height:100%;}

#panel{
width:320px;
background:#f2f2f2;
padding:10px;
overflow:auto;
float:left;
height:100vh;
}

#map{
margin-left:320px;
height:100vh;
}

</style>

</head>

<body>

<div id="login">

<h2>Login</h2>

<input id="passwordInput" type="password" placeholder="Passwort">
<button onclick="login()">Login</button>

<div id="loginError" style="color:red"></div>

</div>

<div id="app">

<div id="panel">

<h2>GPS Tracker</h2>

<input id="nameInput" placeholder="Gerätename">
<button onclick="saveName()">Name speichern</button>

<button onclick="logout()">Logout</button>

<div id="speed"></div>
<div id="battery"></div>
<div id="lastUpdate"></div>

<h3>Geräte</h3>
<div id="deviceList"></div>

</div>

<div id="map"></div>

</div>

<script>

const PASSWORD="${PASSWORD}"
const SESSION_TIME=${SESSION_TIME}

function login(){

const pw=document.getElementById("passwordInput").value

if(pw===PASSWORD){

localStorage.setItem("loginTime",Date.now())
startApp()

}else{

document.getElementById("loginError").innerText="Falsches Passwort"

}

}

function checkSession(){

const t=localStorage.getItem("loginTime")
if(!t) return false

if(Date.now()-t>SESSION_TIME){

localStorage.removeItem("loginTime")
return false

}

return true
}

if(checkSession()) startApp()

function startApp(){

document.getElementById("login").style.display="none"
document.getElementById("app").style.display="block"

initTracker()

}

function logout(){
localStorage.removeItem("loginTime")
location.reload()
}

function initTracker(){

const socket=io()

let id=localStorage.getItem("device_id")

if(!id){
id="device-"+Math.random().toString(36).substr(2,9)
localStorage.setItem("device_id",id)
}

let name=localStorage.getItem("device_name")||"Unbekannt"

window.saveName=function(){

name=document.getElementById("nameInput").value
localStorage.setItem("device_name",name)

}

const map=L.map("map").setView([50,8],10)

L.tileLayer(
'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
).addTo(map)

let markers={}
let paths={}

function formatTime(t){
return new Date(t).toLocaleTimeString()
}

function updateDeviceList(devices){

const list=document.getElementById("deviceList")
list.innerHTML=""

for(const d in devices){

const dev=devices[d]

const div=document.createElement("div")

div.innerHTML=
"<b>"+dev.name+"</b><br>"+
dev.speed.toFixed(1)+" km/h<br>"+
"Battery: "+dev.battery+"%<br>"+
"Zuletzt: "+formatTime(dev.time)

list.appendChild(div)

}

}

socket.on("update",(devices)=>{

updateDeviceList(devices)

for(const d in devices){

const dev=devices[d]

const popup=
"<b>"+dev.name+"</b><br>"+
"Speed: "+dev.speed.toFixed(1)+" km/h<br>"+
"Battery: "+dev.battery+"%<br>"+
"Last: "+formatTime(dev.time)

if(!markers[d]){

markers[d]=L.marker([dev.lat,dev.lon])
.addTo(map)
.bindPopup(popup)
.bindTooltip(dev.name,{permanent:true,direction:"top"})

paths[d]=L.polyline([],{color:"blue"}).addTo(map)

}else{

markers[d].setLatLng([dev.lat,dev.lon])
markers[d].setPopupContent(popup)
markers[d].setTooltipContent(dev.name)

}

paths[d].addLatLng([dev.lat,dev.lon])

map.setView([dev.lat,dev.lon])

}

})

function sendLocation(lat,lon,speed,battery){

fetch("/location",{

method:"POST",
headers:{"Content-Type":"application/json"},

body:JSON.stringify({
id,lat,lon,name,speed,battery
})

})

}

let batteryLevel=100

if(navigator.getBattery){

navigator.getBattery().then(function(b){

batteryLevel=Math.round(b.level*100)

b.addEventListener("levelchange",()=>{
batteryLevel=Math.round(b.level*100)
})

})

}

function updateLocation(pos){

const lat=pos.coords.latitude
const lon=pos.coords.longitude

let speed=pos.coords.speed||0
speed=speed*3.6

document.getElementById("speed").innerText=
"Speed: "+speed.toFixed(1)+" km/h"

document.getElementById("battery").innerText=
"Battery: "+batteryLevel+"%"

document.getElementById("lastUpdate").innerText=
"Updated: "+new Date().toLocaleTimeString()

sendLocation(lat,lon,speed,batteryLevel)

}

/* Haupttracking */

navigator.geolocation.watchPosition(

updateLocation,

err=>console.log(err),

{
enableHighAccuracy:true,
maximumAge:0,
timeout:15000
}

)

/* Backup GPS */

setInterval(()=>{

navigator.geolocation.getCurrentPosition(updateLocation)

},10000)

/* Heartbeat */

setInterval(()=>{

navigator.geolocation.getCurrentPosition(updateLocation)

},20000)

/* Sync */

setInterval(()=>{

fetch("/location-check")

},15000)

/* Tab wieder aktiv */

document.addEventListener("visibilitychange",()=>{

if(!document.hidden){

navigator.geolocation.getCurrentPosition(updateLocation)

}

})

/* Inaktivität */

let lastActivity=Date.now()

document.addEventListener("click",()=>lastActivity=Date.now())
document.addEventListener("touchstart",()=>lastActivity=Date.now())

setInterval(()=>{

if(Date.now()-lastActivity>13*60*1000){

location.reload()

}

},30000)

}

</script>

</body>
</html>

`)

})

app.post("/location",(req,res)=>{

const {id,lat,lon,name,speed,battery}=req.body

devices[id]={lat,lon,name,speed,battery,time:Date.now()}

io.emit("update",devices)

res.sendStatus(200)

})

app.get("/location-check",(req,res)=>{

io.emit("update",devices)
res.sendStatus(200)

})

io.on("connection",socket=>{

socket.emit("update",devices)

})

const PORT=process.env.PORT||3000

server.listen(PORT,()=>{

console.log("Server läuft auf Port "+PORT)

})

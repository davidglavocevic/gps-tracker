const express = require("express")
const http = require("http")
const { Server } = require("socket.io")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.json())

let devices = {}

app.get("/", (req,res)=>{

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

body{
margin:0;
font-family:sans-serif;
display:flex;
}

#panel{
width:320px;
background:#f2f2f2;
padding:10px;
overflow:auto;
}

#map{
flex:1;
height:100vh;
}

.device{
background:white;
padding:6px;
margin-bottom:6px;
}

button{
margin-top:4px;
}

</style>

</head>

<body>

<div id="panel">

<h2>GPS Tracker</h2>

<input id="nameInput" placeholder="Gerätename"/>
<button onclick="saveName()">Name speichern</button>

<button onclick="manualUpdate()">🔄 Jetzt aktualisieren</button>

<div id="device"></div>
<div id="speed"></div>
<div id="address"></div>
<div id="lastUpdate"></div>

<h3>Geräte</h3>
<div id="deviceList"></div>

</div>

<div id="map"></div>

<script>

const socket = io()

let id = localStorage.getItem("device_id")

if(!id){
id = "device-"+Math.random().toString(36).substr(2,5)
localStorage.setItem("device_id",id)
}

let name = localStorage.getItem("device_name") || "Unbekannt"

document.getElementById("device").innerText =
"Gerät: " + name

function saveName(){

name = document.getElementById("nameInput").value

localStorage.setItem("device_name",name)

document.getElementById("device").innerText =
"Gerät: " + name

}

const map = L.map('map').setView([50.0,8.2],10)

L.tileLayer(
'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
).addTo(map)

let markers = {}

function formatTime(timestamp){

const date = new Date(timestamp)

return date.toLocaleTimeString()

}

function updateDeviceList(devices){

const list = document.getElementById("deviceList")

list.innerHTML=""

for(const d in devices){

const dev = devices[d]

const div = document.createElement("div")

div.className="device"

div.innerHTML =
"<b>"+dev.name+"</b><br>"+
dev.speed.toFixed(1)+" km/h<br>"+
"Zuletzt: "+formatTime(dev.time)+"<br>"+
'<button onclick="removeDevice(\\''+d+'\\')">❌ Entfernen</button>'

list.appendChild(div)

}

}

function removeDevice(id){

fetch("/remove",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({id})

})

}

socket.on("update",(devices)=>{

updateDeviceList(devices)

for(const d in devices){

const dev = devices[d]

const popup =
"<b>"+dev.name+"</b><br>"+
dev.speed.toFixed(1)+" km/h<br>"+
"Zuletzt: "+formatTime(dev.time)

if(!markers[d]){

markers[d] = L.marker([dev.lat,dev.lon])
.addTo(map)
.bindPopup(popup)

}else{

markers[d].setLatLng([dev.lat,dev.lon])
markers[d].setPopupContent(popup)

}

}

})

function updateTime(){

const now = new Date()

document.getElementById("lastUpdate").innerText =
"Aktualisiert um: " + now.toLocaleTimeString()

}

function manualUpdate(){

getLocation()

}

let lastLat=null
let lastLon=null

function distance(lat1,lon1,lat2,lon2){

const R=6371000

const dLat=(lat2-lat1)*Math.PI/180
const dLon=(lon2-lon1)*Math.PI/180

const a=
Math.sin(dLat/2)*Math.sin(dLat/2)+
Math.cos(lat1*Math.PI/180)*
Math.cos(lat2*Math.PI/180)*
Math.sin(dLon/2)*Math.sin(dLon/2)

const c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))

return R*c

}

function getLocation(){

navigator.geolocation.getCurrentPosition(

function(pos){

const lat=pos.coords.latitude
const lon=pos.coords.longitude

if(lastLat!==null){

const dist=distance(lastLat,lastLon,lat,lon)

if(dist<10){
return
}

}

lastLat=lat
lastLon=lon

let speed=pos.coords.speed

if(speed===null){
speed=0
}

speed=speed*3.6

document.getElementById("speed").innerText=
"Geschwindigkeit: "+speed.toFixed(1)+" km/h"

fetch(
"https://nominatim.openstreetmap.org/reverse?format=json&lat="+lat+"&lon="+lon
)
.then(res=>res.json())
.then(data=>{

if(data.display_name){

document.getElementById("address").innerText=
"Adresse: "+data.display_name

}

})

fetch("/location",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
id,
lat,
lon,
name,
speed
})

})

updateTime()

},

function(error){

console.log(error)

},

{
enableHighAccuracy:false,
maximumAge:60000,
timeout:10000
}

)

}

navigator.geolocation.watchPosition(

function(){
getLocation()
},

function(error){
console.log(error)
},

{
enableHighAccuracy:false,
maximumAge:60000,
timeout:10000
}

)

</script>

</body>
</html>

`)

})

app.post("/location",(req,res)=>{

const {id,lat,lon,name,speed}=req.body

devices[id]={
lat,
lon,
name,
speed,
time:Date.now()
}

io.emit("update",devices)

res.sendStatus(200)

})

app.post("/remove",(req,res)=>{

const {id}=req.body

delete devices[id]

io.emit("update",devices)

res.sendStatus(200)

})

io.on("connection",(socket)=>{
socket.emit("update",devices)
})

const PORT = process.env.PORT || 3000

server.listen(PORT,()=>{
console.log("Server läuft auf Port "+PORT)
})

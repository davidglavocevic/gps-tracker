const express = require("express")
const http = require("http")
const { Server } = require("socket.io")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.json())

let devices = {}

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

body{
margin:0;
font-family:sans-serif;
}

#map{
height:80vh;
}

#panel{
padding:10px;
background:#f2f2f2;
}

button{
padding:10px;
font-size:16px;
}

</style>

</head>

<body>

<div id="panel">

<button onclick="sendLocation()">
📍 Standort senden
</button>

<span id="device"></span>

</div>

<div id="map"></div>

<script>

const socket = io()

let id = localStorage.getItem("device_id")

if(!id){
id = "device-"+Math.random().toString(36).substr(2,5)
localStorage.setItem("device_id",id)
}

document.getElementById("device").innerText = "ID: "+id

const map = L.map('map').setView([50.0,8.2],10)

L.tileLayer(
'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
).addTo(map)

let markers = {}

socket.on("update",(devices)=>{

for(const d in devices){

const dev = devices[d]

if(!markers[d]){

markers[d] = L.marker([dev.lat,dev.lon])
.addTo(map)
.bindPopup(d)

}else{

markers[d].setLatLng([dev.lat,dev.lon])

}

}

})

function sendLocation(){

if(!navigator.geolocation){
alert("GPS nicht unterstützt")
return
}

navigator.geolocation.getCurrentPosition((pos)=>{

const lat = pos.coords.latitude
const lon = pos.coords.longitude

fetch("/location",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
id,
lat,
lon
})

})

},{
enableHighAccuracy:false,
maximumAge:30000,
timeout:5000
})

}

setInterval(sendLocation,30000)

sendLocation()

</script>

</body>

</html>

`)

})

app.post("/location",(req,res)=>{

const {id,lat,lon} = req.body

devices[id] = {
lat,
lon,
time:Date.now()
}

io.emit("update",devices)

res.sendStatus(200)

})

io.on("connection",(socket)=>{
socket.emit("update",devices)
})

server.listen(3000,()=>{
console.log("Server läuft auf http://localhost:3000")
})
const express = require("express")
const fs = require("fs")

const app = express()

const data = JSON.parse(fs.readFileSync("data.json"))

app.get("/", (req,res)=>{

res.send(`

<!DOCTYPE html>
<html lang="de">
<head>

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">

<title>GlowUp Fahrzeugreinigung</title>

<style>

body{
margin:0;
font-family:Arial;
background:#0d0d0d;
color:white;
}

header{
text-align:center;
padding:40px;
background:black;
}

header img{
width:180px;
}

h1{
color:#f5c518;
}

.section{
padding:40px;
max-width:1000px;
margin:auto;
}

.cards{
display:grid;
grid-template-columns:repeat(auto-fit,minmax(250px,1fr));
gap:20px;
}

.card{
background:#1a1a1a;
padding:20px;
border-radius:10px;
border:1px solid #333;
}

.price{
color:#f5c518;
font-size:22px;
}

button{
background:#f5c518;
border:none;
padding:12px 20px;
border-radius:5px;
cursor:pointer;
font-weight:bold;
}

footer{
text-align:center;
padding:30px;
background:#000;
margin-top:40px;
}

</style>

</head>

<body>

<header>

<img src="https://i.imgur.com/4M7IWwP.png">
<h1>GlowUp</h1>
<p>Innenraumreinigung • Möbelreinigung • Mobil vor Ort</p>

</header>

<div class="section">

<h2>Unsere Services</h2>

<div class="cards">

${data.services.map(s=>`
<div class="card">

<h3>${s.name}</h3>
<p>${s.description}</p>
<div class="price">${s.price}</div>

</div>
`).join("")}

</div>

</div>

<div class="section">

<h2>Einsatzgebiet</h2>

<p>Wir arbeiten mobil in <b>Wiesbaden und Umgebung</b>.</p>

<ul>
${data.locations.map(l=>`<li>${l}</li>`).join("")}
</ul>

</div>

<div class="section">

<h2>Termin buchen</h2>

<p>Kontaktieren Sie uns direkt über WhatsApp.</p>

<a href="https://wa.me/${data.whatsapp}">
<button>WhatsApp Termin buchen</button>
</a>

</div>

<footer>

GlowUp Fahrzeugreinigung • Wiesbaden

</footer>

</body>
</html>

`)

})

const PORT = 3000

app.listen(PORT,()=>{
console.log("GlowUp läuft auf Port "+PORT)
})

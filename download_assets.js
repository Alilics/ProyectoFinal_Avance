const https = require('https');
const fs = require('fs');
const files = [
  {url: 'https://unpkg.com/react@18/umd/react.development.js', name: 'react.development.js'},
  {url: 'https://unpkg.com/react-dom@18/umd/react-dom.development.js', name: 'react-dom.development.js'},
  {url: 'https://unpkg.com/react-router-dom@6/umd/react-router-dom.development.js', name: 'react-router-dom.development.js'},
  {url: 'https://unpkg.com/babel-standalone@6/babel.min.js', name: 'babel.min.js'}
];

(async function(){
  for(const f of files){
    await new Promise((res,rej)=>{
      console.log('downloading',f.url);
      https.get(f.url, r=>{
        if(r.statusCode>=300 && r.statusCode<400 && r.headers.location){
          // follow redirect
          https.get(r.headers.location, rr=>rr.pipe(fs.createWriteStream('frontend/'+f.name)).on('finish',res)).on('error',rej);
          return;
        }
        r.pipe(fs.createWriteStream('frontend/'+f.name)).on('finish',res).on('error',rej);
      }).on('error',rej);
    });
  }
  console.log('done');
})();
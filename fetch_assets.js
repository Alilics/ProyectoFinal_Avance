const https=require('https');
const fs=require('fs');
const urls=[
 'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
 // react-router-dom no longer needed; using simple hash routing instead
 'https://unpkg.com/babel-standalone@6/babel.min.js'
];

async function download(url) {
  return new Promise((resolve,reject)=>{
    https.get(url,res=>{
      if(res.statusCode>=300 && res.statusCode<400 && res.headers.location){
        const loc = res.headers.location.startsWith('http') ? res.headers.location : 'https://unpkg.com'+res.headers.location;
        return https.get(loc, r2 => r2.pipe(fs.createWriteStream('frontend/'+url.split('/').pop())).on('finish',resolve)).on('error',reject);
      }
      res.pipe(fs.createWriteStream('frontend/'+url.split('/').pop())).on('finish',resolve).on('error',reject);
    }).on('error',reject);
  });
}

(async()=>{
  for(const u of urls){
    console.log('downloading',u);
    await download(u);
  }
  console.log('done');
})();
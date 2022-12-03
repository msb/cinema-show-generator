import './App.css';
import * as JSZip from 'jszip';
import { saveAs } from 'file-saver';

function App() {

  const zipit = () => {
    var zip = new JSZip();
    zip.file("Hello.txt", "Hello World\n");
    zip.generateAsync({type:"blob"})
    .then(function(content) {
        // see FileSaver.js
        saveAs(content, "example.jar");
    });
  }

  const fetchit = () => {
    fetch("/cinemashow-0.2.jar")
    .then(function (response) {
        if (response.status === 200 || response.status === 0) {
            return Promise.resolve(response.blob());
        } else {
            return Promise.reject(new Error(response.statusText));
        }
    })
    .then(JSZip.loadAsync)
    .then(function (zip) {
        for(let [filename, file] of Object.entries(zip.files)) {
          // TODO Your code goes here
          console.log(filename);
        }
        zip.file("Hello.txt", "Hello World\n");
        zip.generateAsync({type:"blob"})
        .then(function(content) {
            saveAs(content, "cinemashow.done.jar");
        });
    });
  }

  const cropit = () => {
    var image = new Image();
    image.src = "logo512.png";
    const canvas = document.getElementById('mycanvas');
    const context = canvas.getContext('2d');
    image.onload = function(){
      context.drawImage(image, 100, 100, 200, 200, 0, 0, 200, 200);
    }
  }

  const addimagetozip = () => {
    fetch("/cinemashow-0.2.jar")
    .then(function (response) {
        if (response.status === 200 || response.status === 0) {
            return Promise.resolve(response.blob());
        } else {
            return Promise.reject(new Error(response.statusText));
        }
    })
    .then(JSZip.loadAsync)
    .then(function (zip) {
        const canvas = document.getElementById('mycanvas');
        canvas.toBlob((blob) => {
          zip.file("cropped.png", blob, {base64: true});
          zip.generateAsync({type:"blob"})
          .then(function(content) {
              saveAs(content, "cinemashow.done.jar");
          });
      });
    });
  }

  const previewFile = () => {
    const file = document.querySelector('input[type=file]').files[0];
    const reader = new FileReader();
    reader.onload = () => {
      JSZip.loadAsync(reader.result).then(function (zip) {
        for(let [filename, file] of Object.entries(zip.files)) {
          console.log(filename);
        }
    });
    }
    reader.readAsBinaryString(file);
  }

  return (
    <div className="App">
      <header className="App-header">
        <a className="App-link" onClick={zipit} >
         Create and download JAR
        </a>
        <a className="App-link" onClick={fetchit} >
         Fetch, amend and download JAR
        </a>
        <a className="App-link" onClick={cropit} >
         Crop Image
        </a>
        <a className="App-link" onClick={addimagetozip} >
         Add to zip
        </a>
        <input type="file" onChange={previewFile} />
        <canvas id="mycanvas" width="200px" height="200px"></canvas>
      </header>
    </div>
  );
}

export default App;

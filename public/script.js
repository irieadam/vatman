var jsonObjWithArrayOfVatCodes;
var batch;
var fileSelected = false;

// The event listener for the file upload
document.getElementById('txtFileUpload').addEventListener('change', upload, false);
document.getElementById('validateNumbers').addEventListener('click', process, false);
//document.getElementById('exportResult').addEventListener('click', getFile, false);

function process(evt) {
    var requesterCountryCode = document.getElementById("requesterCountry").value;
    var requesterVatNumber = document.getElementById("requesterVat").value;
        if (!fileSelected || requesterCountryCode.length===0 || requesterVatNumber.length===0) {
            alert('Correct your input');
        } else {
           batch = {
                "requestId" : guid(),
                "requesterCountryCode" : requesterCountryCode,
                "requesterVatNumber" : requesterVatNumber,
                "vatNumbers" : jsonObjWithArrayOfVatCodes.item
            }
            var client = new XMLHttpRequest();
            client.open('POST', '/process', true);
            client.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
            client.setRequestHeader('Auth', getCookie('Auth'));
            client.setRequestHeader('sessionId', getCookie('sessionId'));

            client.onreadystatechange = function () { 
                if (client.readyState == 4 && client.status == 401) {
                    alert('Unauthorized!!!');
                }
            }
            client.send(JSON.stringify(batch));
        }
}

function getFile(evt) { //NOT called anywhere
            var client = new XMLHttpRequest();
            client.open('GET', '/export', true);
           // client.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
            client.setRequestHeader('Auth', getCookie('Auth'));
            client.setRequestHeader('sessionId', getCookie('sessionId'));

            client.setRequestHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8');
            client.setRequestHeader('Accept-Encoding', 'gzip, deflate, sdch, br');
            client.setRequestHeader('Accept-Language', 'en-US,en;q=0.8,nl;q=0.6');
            client.setRequestHeader('Upgrade-Insecure-Requests', 1);

            client.onreadystatechange = function () { 
                if (client.readyState == 4 && client.status == 401) {
                    alert('Unauthorized!!!');
                }
            }
            client.send();
} 


// Method that checks that the browser supports the HTML5 File API
function browserSupportFileUpload() {
  var isCompatible = false;
  if (window.File && window.FileReader && window.FileList && window.Blob) {
    isCompatible = true;
  }
  return isCompatible;
} 
// Method that reads and processes the selected file
function upload(evt) {
  if (!browserSupportFileUpload()) {
    alert('The File APIs are not fully supported in this browser!');
  } else {
    var data = null;
    var file = evt.target.files[0];
    var reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function(event) {
      var csvData = event.target.result;
      var csvTextArray = csvData.split('\n');
      
      var arrayOfObjects = csvTextArray.map(function(e,i) {
        var countryCode = e.split(',')[0];
        var vatNumber = e.split(',')[1];
        return {
          itemId : guid(),
          countryCode: countryCode,
          vatNumber: vatNumber,
          traderName: '',
          traderAddress: '',
          confirmation: '',
          requestTime: '',
          status : '1'
        };
        
      });
      
      var nonEmptyValues = arrayOfObjects.filter(function(i) { return i.countryCode.length > 0; });
      
      jsonObjWithArrayOfVatCodes = { item: nonEmptyValues };
      fillTable();
      fileSelected = true;
      
    };
    reader.onerror = function() {
      alert('Unable to read ' + file.fileName);
    };
  }
}
// why do i need to make these methods myself?? 
function fillTable() {
    var table = document.getElementById('status-table');

    jsonObjWithArrayOfVatCodes.item.forEach(function (vatCode) {
        var tr = document.createElement('tr');

        var td = document.createElement('td');
        td.innerHTML = vatCode.countryCode;
        tr.appendChild(td);

        td = document.createElement('td');
        td.innerHTML = vatCode.vatNumber;
        tr.appendChild(td);

        td = document.createElement('td');
        td.innerHTML = vatCode.traderName;
        tr.appendChild(td);

        td = document.createElement('td');
        td.innerHTML = vatCode.traderAddress;
        tr.appendChild(td);

        td = document.createElement('td');
        td.innerHTML = vatCode.confirmation;
        tr.appendChild(td);

         td = document.createElement('td');
        td.innerHTML = vatCode.requestTime;
        tr.appendChild(td);

        td = document.createElement('td');
        td.innerHTML = vatCode.status;
        tr.appendChild(td);

        table.appendChild(tr);
        });
}

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length,c.length);
        }
    }
    return "";
}

/**
 function submitLogin() {     
           
            var login = { email : document.getElementById("inputEmail3").value,
                            password : document.getElementById("inputPassword3").value 
                        }
            var client = new XMLHttpRequest();
            client.open('POST', '/users/login', true);
            client.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
            client.onreadystatechange = function () { 
                if (client.readyState == 4 && client.status == 200) {
                    var token = client.getResponseHeader("Auth")
                    document.cookie = "Auth="+token;
                    window.location.href = "validation.html";
                }
            }
            client.send(JSON.stringify(login));
        } 
}
 */
var jsonObjWithArrayOfVatCodes = {item : [] } ;
var batch;
var fileSelected = false;

var vm = { vatRequests : ko.observableArray([])};
ko.applyBindings(vm);

var socket = io();


// The event listener for the file upload
document.getElementById('txtFileUpload').addEventListener('change', upload, false);
document.getElementById('validateNumbers').addEventListener('click', process, false);
document.getElementById('logout').addEventListener('click', logout, false);
//document.getElementById('exportResult').addEventListener('click', getFile, false);

socket.on('message', function (message) {
     console.log(JSON.stringify(message));
     var item = ko.utils.arrayFirst(vm.vatRequests(), function (item) {
        return item().itemId() === message.itemId;
      }) || null;
      if (item!=null) {

          item().traderName(message.traderName);
          item().traderAddress(message.traderAddress);
          item().confirmation(message.confirmationNumber);
          item().requestTime(message.updatedAt);
          item().valid(message.valid);
          item().status(message.status);
      }
})

function process(evt) {
    var requesterCountryCode = document.getElementById("requesterCountry").value;
    var requesterVatNumber = document.getElementById("requesterVat").value;
        if (!fileSelected || requesterCountryCode.length===0 || requesterVatNumber.length===0) {
            alert('Please correct your input');
        } else {
           batch = {
                "requestId" : guid(),
                "requesterCountryCode" : requesterCountryCode,
                "requesterVatNumber" : requesterVatNumber,
                "vatNumbers" : []
            }
            var client = new XMLHttpRequest();
            client.open('POST', '/process', true);
            client.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
            client.setRequestHeader('Auth', getCookie('Auth'));
            client.setRequestHeader('sessionId', getCookie('sessionId'));
            client.onreadystatechange = function () { 
                if (client.readyState == 4 && client.status == 401) {
                    alert('Unauthorized');
                } else if (client.readyState == 4 && client.status == 200) {
                   // alert('Submitted');
                }
            }
            ;
         
        vm.vatRequests().forEach(function (request) {
            var requestItem = {};
           if (request().status()=== '3' || request().status()=== '5' ) { 
                //skip
            } else {
                requestItem.itemId = request().itemId();
                requestItem.vatNumber = request().vatNumber();
                requestItem.countryCode = request().countryCode();
                batch.vatNumbers.push(requestItem);
            }
        })
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
                    alert('Unauthorized');
                }
            }
            client.send();
} 

function logout(evt) {
    console.log(window.location);
  //  debugger;
    window.location.href="http://localhost:8000/users/login.html";
        //     var client = new XMLHttpRequest();
        //     client.open('POST', '/users/logout', true);
        //    // client.setRequestHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8');
        //     client.setRequestHeader('Auth', getCookie('Auth'));

        //     client.onreadystatechange = function (foo) { 
   
        //         if (client.readyState == 4 && client.status == 302) {
                    
        //         }
        //     }
        //     client.send();
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
        var countryCode = e.split(';')[0];
        var vatNumber = e.split(';')[1];
        return {
          itemId : guid(),
          countryCode: countryCode,
          vatNumber: vatNumber,
          traderName: '',
          traderAddress: '',
          confirmation: '',
          requestTime: '',
          valid: '',
          status : '1'
        };
        
      });
     

      var nonEmptyValues = arrayOfObjects.filter((i)=> i.countryCode.length > 0);
      var observablearize = function (v) {
          for(prop in v ){
              if (v.hasOwnProperty(prop)) {
                  v[prop] = ko.observable(v[prop]);
              }
          };

          return ko.observable(v);
      } ; 
      var observableVatRequests = nonEmptyValues.map(observablearize);
      vm.vatRequests(observableVatRequests);

      //fillTable();
      fileSelected = true;
      
    };
    reader.onerror = function() {
      alert('Unable to read ' + file.fileName);
    };
  }
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


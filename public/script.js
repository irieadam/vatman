var jsonObjWithArrayOfVatCodes = {item : [] } ;
var batch;
var fileSelected = false;

var vm = {  requesterCountryCode : ko.observable(""),
            requesterVatNumber : ko.observable(""),
            validateIsAllowed : ko.observable(false),
            exportIsAllowed : ko.observable(false), 
            vatRequests : ko.observableArray([])
            };
var failureCount = ko.computed(function() {
    var items = ko.utils.arrayFilter(vm.vatRequests(), function(item) {
         return item().status() === "4";
    });

    return items.length;
});
ko.applyBindings(vm);

var socket = io();

var dropbox;

dropbox = document.getElementById("main-container");
dropbox.addEventListener("dragenter", dragenter, false);
dropbox.addEventListener("dragover", dragover, false);
dropbox.addEventListener("drop", drop, false);

// The event listener for the file upload
document.getElementById('txtFileUpload').addEventListener('change', upload, false);
document.getElementById('validateNumbers').addEventListener('click', process, false);
document.getElementById('logout').addEventListener('click', logout, false);
document.getElementById('clear').addEventListener('click', clear, false);

socket.on('message', function (message) {
    // console.log(JSON.stringify(message));
     var item = ko.utils.arrayFirst(vm.vatRequests(), function (item) {
        return item().itemId() === message.itemId;
      }) || null;
      if (item!=null) {

          item().traderName(message.traderName);
          item().traderAddress(message.traderAddress);
          item().confirmation(message.confirmationNumber);
          item().requestTime(message.updatedAt.toString().substring(0,10));
          item().valid(message.valid);
          item().status(message.status);
          item().retries(message.retries);
      }
        vm.exportIsAllowed(true);
        
})

function clear(evt) {
    vm.validateIsAllowed(false);
    vm.exportIsAllowed(false);   
    vm.vatRequests.remove(function (status) {return status != 999});

}

function process(evt) { 

    if (!fileSelected || vm.requesterCountryCode().length===0 || vm.requesterVatNumber().length===0) {
            var messages = ["Please provide: "];

            if (!fileSelected ) {
                messages.push("vat numbers to process ");
            };
            if (vm.requesterCountryCode().length ==0) {
                messages.push("requestor country code ");
            };
            if (vm.requesterVatNumber().length ==0) {
                messages.push("requestor vat number ");
            };
            alert(messages.toString()) ;

        } else {

        batch = {
            "requestId" : guid(),
            "requesterCountryCode" : vm.requesterCountryCode(),
            "requesterVatNumber" : vm.requesterVatNumber(),
            "vatNumbers" : []
        }

        var client = new XMLHttpRequest();
        client.open('POST', '/process', true);
        client.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
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
            requestItem.itemId = request().itemId();
            requestItem.vatNumber = request().vatNumber();
            requestItem.countryCode = request().countryCode();
            batch.vatNumbers.push(requestItem);
            })
          client.send(JSON.stringify(batch));
        }
}

function logout(evt) {
    console.log(window.location);
    window.location.href="http://localhost:8000/users/login.html";
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

// functions for file transfer 
function dragenter(e) {
  e.stopPropagation();
  e.preventDefault();
}

function dragover(e) {
  e.stopPropagation();
  e.preventDefault();
}

function drop(e) {
 
  e.stopPropagation();
  e.preventDefault();
  var dt = e.dataTransfer;
  var files = dt.files;

  handleFiles(files);
}


function browserSupportFileUpload() {
  var isCompatible = false;
  if (window.File && window.FileReader && window.FileList && window.Blob) {
    isCompatible = true;
  }
  return isCompatible;
} 
// Method that reads and processes the selected csv file
function upload(evt) {

  if (!browserSupportFileUpload()) {
    alert('The File APIs are not fully supported in this browser!');
  } else {
    handleFiles(evt.target.files);
  }
}

function handleFiles (files) {

    var data = null;
    var file = files[0];
    var reader = new FileReader();
    var fileType = file.type;
    var csvData; 

    if (fileType === "text/csv") {          
        reader.readAsText(file);
    } else if (fileType === "application/vnd.ms-excel" || fileType ===  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
        reader.readAsBinaryString(file);
    }

    reader.onload = function(event) {

      if (fileType === "text/csv") {
         csvData = event.target.result;

      } else if (fileType === "application/vnd.ms-excel" || fileType ===  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")  {
         var data = event.target.result;
         var cfb = XLSX.read(data, {type: 'binary'});
         var sheetName = cfb.SheetNames[0];
         csvData = XLS.utils.make_csv(cfb.Sheets[sheetName]);   
      }

      // format input
      var csvTextArray = csvData.split('\n');
      var arrayOfObjects = csvTextArray.map(function(e,i) {
      var countryCode = e.split(';')[0];
      var vatNumber = e.split(';')[1];
       
       // deal with commas
        if (typeof vatNumber =='undefined' || typeof countryCode =='undefined') {
            countryCode = e.split(',')[0];
            vatNumber =  e.split(',')[1];
        };

        // remove spaces
        if (typeof vatNumber !='undefined' && typeof countryCode !='undefined') {
           countryCode = countryCode.replace(" ","");
           vatNumber = vatNumber.replace(" ","");
        };

        //remove line breaks
        if (typeof vatNumber !='undefined' && typeof countryCode !='undefined') {
           countryCode = countryCode.replace(/\r/g, ""),
           vatNumber = vatNumber.replace(/\r/g, "")
        };

        return {
          itemId : guid(),
          countryCode: countryCode,
          vatNumber: vatNumber,
          traderName: '',
          traderAddress: '',
          confirmation: '',
          requestTime: '',
          valid: '',
          status : '1',
          retries : 0
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
      vm.validateIsAllowed(true);
      
    };
    reader.onerror = function() {
      alert('Unable to read ' + file.fileName);
    };

}

function updateItem (evt) {
    debugger;
}

function setRequesterVatNumber() {
        vm.requesterVatNumber(document.getElementById("requesterVat").value);
}

function setRequesterCountryCode() {
         vm.requesterCountryCode(document.getElementById("requesterCountry").value);
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

function contry (evt) {
    debugger;
}
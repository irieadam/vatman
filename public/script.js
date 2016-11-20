var submitLogin;
(function(){
   submitLogin = function submitLogin() {     
           
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

)();
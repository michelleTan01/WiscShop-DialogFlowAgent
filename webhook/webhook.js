const express = require('express')
const { WebhookClient } = require('dialogflow-fulfillment')
const app = express()
const fetch = require('node-fetch')
const base64 = require('base-64')

let username = "";
let password = "";
let token = "";
let categories = "";
let tags = "";
let products = "";
USE_LOCAL_ENDPOINT = false;
// set this flag to true if you want to use a local endpoint
// set this flag to false if you want to use the online endpoint
ENDPOINT_URL = ""
if (USE_LOCAL_ENDPOINT) {
  ENDPOINT_URL = "http://127.0.0.1:5000"
} else {
  ENDPOINT_URL = "https://mysqlcs639.cs.wisc.edu"
}



async function getToken() {
  let request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + base64.encode(username + ':' + password)
    },
    redirect: 'follow'
  }

  const serverReturn = await fetch(ENDPOINT_URL + '/login', request)
  const serverResponse = await serverReturn.json()
  //console.log(serverResponse)
  token = serverResponse.token

  return token;
}

app.get('/', (req, res) => res.send('online'))
app.post('/', express.json(), (req, res) => {
  const agent = new WebhookClient({ request: req, response: res })


  async function postMsg(msg, user) {
    let date = new Date()
    let b = {
      "date": date.toISOString(),
      "isUser": user,
      "text": msg
    }
    let request = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      body: JSON.stringify(b),
      redirect: 'follow'
    }
    await fetch(ENDPOINT_URL + '/application/messages', request)
  }

  function searchProduct(name){
    for (const p in products){
      if(products[p].name === name){
        return products[p]
      }
    }
    return ""
  }


  async function welcome() {
    agent.add(agent.consoleMessages[0].text)
    console.log(ENDPOINT_URL)
    if (token) {
      await postMsg(agent.query, true);
      await postMsg(agent.consoleMessages[0].text, false)
    }
  }


  async function login() {

    // You need to set this from `username` entity that you declare in DialogFlow
    username = agent.parameters.username
    // You need to set this from password entity that you declare in DialogFlow
    password = agent.parameters.password
    agent.add("Ok, attempting to log you in with username: \"" + username + "\" and password: \"" + password + "\".")

    await getToken()
    
    
    //agent.add(token)
    if (!token) { 
      agent.add("Log in failed, username and password entered is not a valid pair.")
      username = "";
      password = "";
      token = "";
      return;
    }

    //delete all messages
    let delrequest = {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      redirect: 'follow'
    }
    await fetch(ENDPOINT_URL + '/application/messages', delrequest);
    let r1 = "Successfully logged in as \"" + username + "\"! What would you like to do at WiscShop today?";
    agent.add(r1)
    await postMsg(r1, false);
    await fetchCategories()
    await fetchProducts()
    await fetchTags()
  }

  async function fetchCategories() {
    let requestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      redirect: 'follow'
    };

    let response = await fetch(ENDPOINT_URL + '/categories/', requestOptions);
    let result = await response.json();

    categories = result.categories
  }

  async function fetchProducts() {
    let requestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      redirect: 'follow'
    };

    let response = await fetch(ENDPOINT_URL + '/products/', requestOptions);
    let result = await response.json();

    products = result.products
  }

  async function fetchTags() {
    let requestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      redirect: 'follow'
    };

    let response = await fetch(ENDPOINT_URL + '/tags', requestOptions);
    let result = await response.json();

    tags = result.tags
  }

  async function fetchCart() {
    let requestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      redirect: 'follow'
    };

    let response = await fetch(ENDPOINT_URL + '/application/products', requestOptions);
    let result = await response.json();

    return result.products
    
  }

  async function navCategory() {
    
    await postMsg(agent.query, true)
    if(!token){
      let msg = "Sorry, you will need to log in first before performing this task."
      await postMsg(msg, false)
      agent.add(msg);
      return
    }
    let category = agent.parameters.category;
    if (!categories.includes(category)) {
      let msg = "Sorry, but \"" + category + "\" is not a category in our inventory."
      agent.add(msg)
      await postMsg(msg, false)
      return;
    }
    //clear previous tags
    /*
     let r = {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      redirect: 'follow'
    }
    await fetch(ENDPOINT_URL + '/application/tags', r);

     */
    

    let body = {
      "back": false,
      "dialogflowUpdated": true,
      "page": '/' + username + "/" + category
    }
    let request = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      body: JSON.stringify(body),
      redirect: 'follow'
    }
    let msg = "Ok, You are at " + category + " now.";
    await fetch(ENDPOINT_URL + '/application', request);
    await postMsg(agent.consoleMessages[0].text, false)
    agent.add(agent.consoleMessages[0].text);
  }


  async function mainPage() {
    await postMsg(agent.query, true)
    if(!token){
      let msg = "Sorry, you will need to log in first before performing this task."
      await postMsg(msg, false)
      agent.add(msg);
      return
    }
    let body = {
      "back": false,
      "dialogflowUpdated": true,
      "page": '/' + username
    }
    let request = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      body: JSON.stringify(body),
      redirect: 'follow'
    }
    await fetch(ENDPOINT_URL + '/application', request)
    let msg = "You are at the home page now."
    agent.add(msg)
    await postMsg(msg, false)
  }

  async function back() {
    await postMsg(agent.query, true)
    if(!token){
      let msg = "Sorry, you will need to log in first before performing this task."
      await postMsg(msg, false)
      agent.add(msg);
      return
    }
    let body = {
      "back": true,
      "dialogflowUpdated": true
    }
    let request = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      body: JSON.stringify(body),
      redirect: 'follow'
    }
    await fetch(ENDPOINT_URL + '/application', request)
    let msg = "You are at the previous page now"
    agent.add(msg)
    await postMsg(msg, false)
    //const serverReturn = await fetch(ENDPOINT_URL + '/application',request)
    // const serverResponse = await serverReturn.json()
    // //console.log(serverResponse)
    // token = serverResponse.token

    // return token;
  }

  async function loggedIn() {
    console.log(token)
    if (token == "") {
      agent.add("You are not logged in at this point.")
    } else {
      await postMsg(agent.query, true)
      let msg="You are logged in. Enjoy your time at WiscShop!";
      await postMsg(msg, false)
      agent.add(msg)
    }
  }
  async function preNavCategory(){
    await postMsg(agent.query, true)
    //await postMsg(agent.consoleMessages[0].text, false)
    //let msg = "Which category are you interested in?"
    await postMsg(agent.consoleMessages[0].text, false)
    agent.add(agent.consoleMessages[0].text)

  }

  async function queryCategories(){
    await postMsg(agent.query, true)
    if(!token){
      let msg = "Sorry, you will need to log in first before performing this task."
      await postMsg(msg, false)
      agent.add(msg);
      return
    }
    await postMsg(agent.consoleMessages[0].text, false)
    agent.add(agent.consoleMessages[0].text)
  }

  async function navCart() {
    await postMsg(agent.query, true)
    if(!token){
      let msg = "Sorry, you will need to log in first before performing this task."
      await postMsg(msg, false)
      agent.add(msg);
      return
    }
    let body = {
      "back": false,
      "dialogflowUpdated": true,
      "page": '/' + username+"/cart"
    }
    let request = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      body: JSON.stringify(body),
      redirect: 'follow'
    }
    await fetch(ENDPOINT_URL + '/application', request)
    
    await postMsg(agent.consoleMessages[0].text, false)
    agent.add(agent.consoleMessages[0].text)
  }

  async function navConfirm() {
    await postMsg(agent.query, true)
    if(!token){
      let msg = "Sorry, you will need to log in first before performing this task."
      await postMsg(msg, false)
      agent.add(msg);
      return
    }
    let body = {
      "back": false,
      "dialogflowUpdated": true,
      "page": '/' + username+"/cart-confirmed"
    }
    let request = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      body: JSON.stringify(body),
      redirect: 'follow'
    }
    await fetch(ENDPOINT_URL + '/application', request)
    
    await postMsg(agent.consoleMessages[0].text, false)
    agent.add(agent.consoleMessages[0].text)
    let msg = "Thank you for choosing WiscShop!"
    await postMsg(msg, false)
    agent.add(msg)
  }


  async function navProduct() {
    await postMsg(agent.query, true)
    if(!token){
      let msg = "Sorry, you will need to log in first before performing this task."
      await postMsg(msg, false)
      agent.add(msg);
      return
    }
    
    let product = agent.parameters.product;
    // let found = false;
    // let category = "";
    // let id = "";
    // for (const p in products){
    //   if(products[p].name === product){
    //     found = true;
    //     category = products[p].category;
    //     id = products[p].id;
    //     break;
    //   }
    // }
    let prodObj = searchProduct(product)

    if(!prodObj){
      let msg = "Sorry, but \"" + category + "\" is not a product in our inventory."
      agent.add(msg)
      await postMsg(msg, false)
      return;
    }
    let category = prodObj.category;
    let id = prodObj.id;
    // if (!products.includes(product)) {
    //   let msg = "Sorry, but \"" + category + "\" is not a product in our inventory."
    //   agent.add(msg)
    //   await postMsg(msg, false)
    //   return;
    // }

    let body = {
      "back": false,
      "dialogflowUpdated": true,
      "page": '/' + username + "/" + category+ "/products/"+id
    }
    let request = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      body: JSON.stringify(body),
      redirect: 'follow'
    }
    await fetch(ENDPOINT_URL + '/application', request);
    await postMsg(agent.consoleMessages[0].text, false)
    agent.add(agent.consoleMessages[0].text);
  }

  async function addToCart(product){
    let request = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      body: JSON.stringify(product),
      redirect: 'follow'
    }
    await fetch(ENDPOINT_URL + '/application/products/' + product.id, request)
  }
  async function deleteFromCart(product){
    let request = {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      redirect: 'follow'
    }
    await fetch(ENDPOINT_URL + '/application/products/' + product.id, request)
  }

  async function addProdCon(){
    await postMsg(agent.query, true)
    if(!token){
      let msg = "Sorry, you will need to log in first before performing this task."
      await postMsg(msg, false)
      agent.add(msg);
      return
    }

    let name  = agent.context.get(["product-chosen"]).parameters.product;
    let number = agent.parameters.numProduct;
    if(!number){
      number = 1
    }
    //find product
    let product = searchProduct(name)

    for(let i = 0; i<number; i++){
      await addToCart(product)
    }
    await postMsg(agent.consoleMessages[0].text, false)
    agent.add(agent.consoleMessages[0].text)
  }
  async function addProd(){
    await postMsg(agent.query, true)
    if(!token){
      let msg = "Sorry, you will need to log in first before performing this task."
      await postMsg(msg, false)
      agent.add(msg);
      return
    }
    
    let name  = agent.parameters.product;
    let number = agent.parameters.number;
    if(!number){
      number = 1
    }
    //find product
    let product = searchProduct(name)

    for(let i = 0; i<number; i++){
      await addToCart(product)
    }
    
    await postMsg(agent.consoleMessages[0].text, false)
    agent.add(agent.consoleMessages[0].text)
  }

  async function removeProd(){
    await postMsg(agent.query, true)
    if(!token){
      let msg = "Sorry, you will need to log in first before performing this task."
      await postMsg(msg, false)
      agent.add(msg);
      return
    }
    let cart = await fetchCart()
    let name  = agent.parameters.product;
    let number = agent.parameters.number;
    if(!number){
      number = 1
    }

    let validProduct = false;
    //console.log(cart)
    for (const p in cart){
      console.log(cart[p].count)
      console.log(cart[p].name)
        
      if(cart[p].name === name && cart[p].count>= number){
        validProduct = true;
      }
    }
    if(!validProduct){
      let msg = "Sorry, there are less than "+number+" "+name+" in the cart. We can not remove your selection at this point"
      await postMsg(msg, false)
      agent.add(msg);
      return
    }
    
    //find product
    let product = searchProduct(name)

    for(let i = 0; i<number; i++){
      await deleteFromCart(product)
    }

    let msg = "";
    if(number === 1||name.charAt(name.length - 1) === "s"){
      msg = "Alright, "+number+" "+name+" has been removed from your cart."
    }else{
      msg = "Alright, "+number+" "+name+"s have been removed from your cart."
    }
    await postMsg(msg, false)
    agent.add(msg)
  }

  async function clearCart(){
    await postMsg(agent.query, true)
    if(!token){
      let msg = "Sorry, you will need to log in first before performing this task."
      await postMsg(msg, false)
      agent.add(msg);
      return
    }
    let request = {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      redirect: 'follow'
    }
    await fetch(ENDPOINT_URL + '/application/products', request)
    await postMsg(agent.consoleMessages[0].text, false)
    agent.add(agent.consoleMessages[0].text)

  }

  async function fetchTagForCat(cat){
    let requestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      redirect: 'follow'
    };

    let response = await fetch(ENDPOINT_URL + '/categories/'+cat+"/tags", requestOptions);
    let result = await response.json();

    return result.tags
  }
  async function addTags(){
    await postMsg(agent.query, true)
    if(!token){
      let msg = "Sorry, you will need to log in first before performing this task."
      await postMsg(msg, false)
      agent.add(msg);
      return
    }
    //clear tags
    let request = {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      redirect: 'follow'
    }
    await fetch(ENDPOINT_URL + '/application/tags/', request)


    let category = agent.context.get(["category-chosen"]).parameters.category;
    let inputTags = agent.parameters.tag;
    for(const t in inputTags){
      let temp = await addTag(category,inputTags[t])
      if(!temp){
        return;
      }
    }
    await postMsg(agent.consoleMessages[0].text, false)
    agent.add(agent.consoleMessages[0].text)
    
  }

  async function addTag(category, tag){
  
    //check if tag is valid
    if(!tags.includes(tag)){
      let msg = "Sorry, "+tag+" is not a valid tag."
      await postMsg(msg, false)
      agent.add(msg);
      return false
    }
    console.log(tags)
    //check if tag exists in category
    let currTags = await fetchTagForCat(category);
    console.log(currTags)
    if(!currTags.includes(tag)){
      let msg = "Sorry, "+tag+" is not a tag in "+category+"."
      await postMsg(msg, false)
      agent.add(msg);
      return false
    }

    let request = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      body: JSON.stringify({tag}),
      redirect: 'follow'
    }
    await fetch(ENDPOINT_URL + '/application/tags/' + tag, request)
    return true;
  }

  async function queryCart(){
    await postMsg(agent.query, true)
    if(!token){
      let msg = "Sorry, you will need to log in first before performing this task."
      await postMsg(msg, false)
      agent.add(msg);
      return
    }
    let cart = await fetchCart();
    if(cart.length === 0){
      let msg = "You currently have 0 items in your cart."
      await postMsg(msg, false)
      agent.add(msg);
      return
    }

    let totCount = 0;
    let totCost = 0;
    let types = {};
    for(const i in cart){
      let item = cart[i];
      totCount += item.count;
      totCost += item.count * item.price;
      if(types[item.category]){
        types[item.category] += item.count;
      }else{
        types[item.category] = item.count;
      }
    }
    console.log(totCount)
    console.log(totCost)
    console.log(types)

    let count = "A total of " + totCount + " item(s) is in your cart"
    let cost = ", and the total cost in your cart is " + totCost + " dollars. "
    let t = "There are ";
    for (const j in types){
      t += types[j] + " item(s) in " + j + " and ";
    }
    let msg = count + cost + t.substring(0,t.length - 5) + ".";
    console.log(t)
    await postMsg(msg, false)
    agent.add(msg)
  }
  async function getReview(product){
    let requestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      redirect: 'follow'
    };

    let response = await fetch(ENDPOINT_URL + '/products/' + product.id + "/reviews", requestOptions);
    let result = await response.json();

    return result.reviews;
  }
  async function queryProduct(){
    await postMsg(agent.query, true)
    if(!token){
      let msg = "Sorry, you will need to log in first before performing this task."
      await postMsg(msg, false)
      agent.add(msg);
      return
    }
    let product = searchProduct(agent.parameters.product)
    let requestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      redirect: 'follow'
    };

    let response = await fetch(ENDPOINT_URL + '/products/' + product.id + "/reviews", requestOptions);
    let result = await response.json();

    let revs =  result.reviews;
    
    if(revs.length == 0){
      let msg = product.name + " has the price of " + product.price + " dollars, and there are no reviews."
      await postMsg(msg, false)
      agent.add(msg)
      return
    }
    let avg = 0.0;
    let count = 0;
    
    let r = "The reviews are ";
    for(const i in revs){
      avg += revs[i].stars;
      count ++;
      r += "\""+revs[i].text+"\" with " + revs[i].stars + " stars and "
    }
    avg = avg/count;
    
    let msg = product.name + " has the price of " + product.price + " dollars, and it has "+count+" review(s) with an average rating of " + avg + " stars. "+r.substring(0,r.length - 5) + ".";
    await postMsg(msg, false)
    agent.add(msg)
  }

  async function queryTags(){
    await postMsg(agent.query, true)
    if(!token){
      let msg = "Sorry, you will need to log in first before performing this task."
      await postMsg(msg, false)
      agent.add(msg);
      return
    }

    let requestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      redirect: 'follow'
    };
    let category = agent.context.get(["category-chosen"]).parameters.category
    let response = await fetch(ENDPOINT_URL + '/categories/' + category + "/tags", requestOptions);
    let result = await response.json();
    let t = result.tags;

    let msg = "Tags in " + category + " includes: "
    for(const i in t){
      if(i != t.length -1){
        msg += t[i] + ", "
      }else{
        msg += "and " + t[i] +"."
      }
      
    }
    await postMsg(msg, false)
    agent.add(msg)
  }



  let intentMap = new Map()
  intentMap.set('addProduct', addProd)
  intentMap.set('addProductByContext', addProdCon)
  intentMap.set('CheckLoginStatus', loggedIn)
  intentMap.set('ClearCartProducts', clearCart)
  intentMap.set('ConfirmCart', navConfirm)
  intentMap.set('Default Welcome Intent', welcome)
  intentMap.set('FilterByTag', addTags)
  intentMap.set('GoBack', back)
  intentMap.set('GoHome', mainPage)
  intentMap.set('Login', login)
  intentMap.set('NavByCategory', navCategory)
  intentMap.set('NavByProduct', navProduct)
  intentMap.set('NavToCart', navCart)
  intentMap.set("PromptNavCategory",preNavCategory)
  intentMap.set("QueryCart",queryCart)
  intentMap.set("QueryCategories",queryCategories)
  intentMap.set("QueryProduct",queryProduct)
  intentMap.set("QueryTags",queryTags)
  intentMap.set("RemoveProductinCart",removeProd)

  agent.handleRequest(intentMap)
})

app.listen(process.env.PORT || 8080)

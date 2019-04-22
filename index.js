var axios = require("axios");
var cheerio = require("cheerio");
var fs = require("fs");

const baseURL = "https://www.amazon.com";
const searchURL =
  "/s/ref=nb_sb_noss?url=search-alias%3Dstripbooks&field-koeywords=";

class Product {
  constructor(
    id,
    name,
    listPrice,
    description,
    product_dimensions,
    imageURLs,
    weight,
    sourceURL
  ) {
    this.id = id;
    this.name = name;
    this.listPrice = listPrice;
    this.description = description;
    this.product_dimensions = product_dimensions;
    this.imageURLs = imageURLs;
    this.weight = weight;
    this.sourceURL = sourceURL;
  }
}
var obj = {
    arrayData: []
}

amazonCrawler = async () => {
  let response = await axios.get(baseURL + searchURL);
  let html = response.data;
  let $ = await cheerio.load(html);
 
  process.on("unhandledRejection", (reason, promise) => {
    console.warn(
      "Unhandled promise rejection:",
      promise,
      "reason:",
      reason.stack || reason
    );
  });

 
  linkData = getBookList($);
  getData(linkData);
 
};

amazonCrawler();

const getDescription = $ => {
 
   var description = $('script[id="bookDesc_override_CSS"]').next().text().replace(/(<([^>]+)>)/gi, "");
    description = $("<textarea/>").html(description).text();
    return description;
};
const getPrice = $ => {
  var price;
  if ($("tr.print-list-price")) {
    $("tr.print-list-price").children("td").each(function() {
        
        if ($(this).text().includes("$"))
          return (price = $(this).text().trim(""));
          else return;
          
      });
  }
  if (price === undefined) {
    if ($("span.a-text-strike")) price = $("span.a-text-strike").text();
    if (price === "") price = "No List Price";
    
    
  }
  return price
};

const getImgUrl =($) => {
  var imgURL = [];
  if ($("#imgThumbs > div > img")) {
    $("#imgThumbs > div > img").each(function() {
      imgURL.push({ img: $(this).attr("src") });
    });
  } else {
    imgURL = [];
  }
  return imgURL
}

getbookData = async ($, link, title, count) => {

 description = getDescription($);
 price = getPrice($);

  var dimensions;
  var weight;
  $("#productDetailsTable > tbody > tr > td > div > ul > li > b").each(function() {
      if ($(this).text().includes("Dimensions"))
        dimensions = $(this).parent().text().replace("Product", "").replace("Dimensions:", "").replace("Package", "").trim("");

      if ($(this).text().includes("Weight"))
        weight = $(this).parent().text().replace("Shipping Weight:", "").replace("(View shipping rates and policies)", "").trim("");
    }
  );

  if (dimensions === undefined)
    dimensions = "Dimensions not specified on Webpage Link";
  if (weight === undefined) 
    weight = "Weight not specified on Webpage Link";

  imgURL=getImgUrl($)
  product = new Product(count,title,price,description,dimensions,imgURL,weight,link);
  obj.arrayData.push({product})


  let jsonString = JSON.stringify(obj, null,2)
  fs.writeFileSync('./output.json',jsonString)

   return await Promise.resolve("ok");
};


const getData = async (linkData) => {
   return await Promise.all(
        linkData.map(async i => {
          let response = await axios.get(i.link).catch();
          let html = response.data;
          let $ = await cheerio.load(html);
          getbookData($, i.link, i.title, i.count);
          
        })
      ).catch(err => {});
 
};

getBookList = $ => {
  var count = 1;
  data = [];
  $("a.acs_product-image").map((cv, i) => {
    let title = $(i).attr("title");
    let bookLink = baseURL + $(i).attr("href");
    data.push({ title: title, link: bookLink, count: count });
    count++;
  });
  return data;
};
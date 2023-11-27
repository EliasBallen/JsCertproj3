require('dotenv').config();
const express = require('express');
const cors = require('cors')
const app = express();
const bodyParser = require('body-parser')
const mongoose = require('mongoose');

app.use(cors({optionsSuccessStatus: 200}));
app.use('/public',express.static('public'));

app.use(bodyParser.urlencoded({extended:"false"}));
app.use(bodyParser.json());
//mongoose.set('useNewUrlParser',true)
//mongoose.set('useUnifiedTopology', true)
mongoose.connect(process.env.MONGO_URI)

const counterSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
    },
    name:{
        type: String,
        required: true,
    },
    seq: {
        type: Number,
        default: 0,
    },
});

// Add a static "increment" method to the Model
// It will recieve the collection name for which to increment and return the counter value
counterSchema.static('increment', async function(counterName) {
    const count = await this.findOneAndUpdate(
        {name:counterName},
        {$inc: {seq: 1}},
        // new: return the new value
        // upsert: create document if it doesn't exist
        {new: true, upsert: true}
    );
    return count.seq;
});

const CounterModel = mongoose.model('Counter', counterSchema);


const urlSchema = new mongoose.Schema({
    short_url:{
        type:Number,
        alias:'id',
        require:true
    },    
    original_url:{
        type:String,
        required:true
    }
},{collection:'urlsSaved'})



urlSchema.pre('save',async function(next){
    if(!this.isNew)return;
    const newshorturl = await CounterModel.increment('urlsSaved');
    console.log(this.short_url)
    this.short_url = newshorturl

})

let Url = mongoose.model('Url',urlSchema);

async function createAndSaveUrl(original_url,done){
    let newUrl = new Url({
        original_url:original_url
    })
    try {
        const data = await newUrl.save();
        const findedData = await findUrlByMongoId(data._id,done)
        done(null,findedData);
        return findedData;        
    } catch (err) {
        done(err);
    }
}
async function findUrlByMongoId(urlId,done){
    try {
        const data = await Url.findOne({_id:urlId});
        done(null,data)
        return data        
    } catch (err) {
        done(err)   
    }
}
async function findUrlById(urlId,done){
    try {
        const data = await Url.findOne({short_url:urlId});
        done(null,data)
        return data        
    } catch (err) {
        done(err)   
    }
}
async function findByOriginalUrl(original_url,done){
    try {
        const data = await Url.findOne({original_url:original_url})
        done(null,data)   
        return data;         
    } catch (err) {
        done(err)      
    }
}
async function findByUrlAndRemove(original_url,done){
   try {
    const data = await Url.findOneAndDelete({original_url: original_url})
    done(null,data)
    return data  
   } catch (err) {
    done(err)
   }
}
function donefunct(err=null,data=null){
    console.log(err||data)
}


app.get('/api/shorturl/:shorcut_Id',async(req,res)=>{
    //findByUrlAndRemove('https://www.freecodecamp.org/',donefunct)
    console.log(req.params.shorcut_Id)
    const regex = /^([0-9])*([0-9])$/;
    const shorcut_Id = req.params.shorcut_Id;
    if(!regex.test(shorcut_Id)){
        res.json({error:"invalid shortcut"})
        return;
    }
    try {
        data = await findUrlById(parseInt(shorcut_Id),donefunct)        
        if(!data){res.json({error:"no url associated with the shortcut"})}
        res.redirect(data.original_url)
        //res.json({original_url:data.original_url,shorcut_Id:data.short_url})        

    } catch (error) {
        {error:"error happened"}        
    }

    

})

app.get('/',(req,res)=>{
    //findByUrlAndRemove('https://www.freecodecamp.org/',donefunct)
    res.sendFile(__dirname+"/views/index.html");
})
app.post('/api/shorturl',async(req,res)=>{
    //console.log(req.body)
    const url = req.body.url;    
    const regex = /^(https?:\/\/)?(\w{2,}\.)?(\w+)\.(\w+)(\/\w+)*\/?$/

    if(!regex.test(url)){
        res.json({error:"invalid url"})
        return;
    }

    const finded = await findByOriginalUrl(url, donefunct);
    if(finded){
        console.log('finded')
        res.json({"original_url":`${req.body.url}`,"short_url":finded.short_url})
    }
    else{
        console.log('created')
        const newUrl = await createAndSaveUrl(req.body.url,donefunct)    
        res.json({"original_url":`${req.body.url}`,"short_url":newUrl.short_url})
    }
})

const listener = app.listen(process.env.PORT||3000,()=>{
    console.log("your app is listening on port " + listener.address().port)
})
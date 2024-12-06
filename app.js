const express = require('express');
const app = express();
const path = require('path');
const methodoverride = require('method-override');
const mongoose = require('mongoose');
const multer = require('multer')
const fs = require("fs")

app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');
app.use(express.static('public'));
app.use(methodoverride('_method'));



mongoose.connect('mongodb://localhost:27017/pictures', {
    useNewUrlParser: true, // Note: 'useNewUrlParser' (case-sensitive)
    useUnifiedTopology: true
}).then(() => {
    console.log("Connection made successfully");
}).catch((err) => {
    console.log("Found an error while connecting:", err);
});
app.get('/',(req,res) =>{
    pictures.find().then((img) => {
        res.render('index',{images:img});

    })
  
})

let imagesSchema = new mongoose.Schema({
    imageUrl : "string",
})

let pictures = mongoose.model('images',imagesSchema)

app.get('/upload', (req, res) => {
    res.render('upload'); // Ensure the file is named 'upload.ejs'
});



let storage = multer.diskStorage({
    destination :"./public/upload/",
    filename: (req,file,cb) =>{
        cb(null, file.originalname)
    }
});

let upload = multer({
    storage : storage,
    fileFilter : (req,file,cb) => {
        checkFileType(file,cb)
    }
    
})

const checkFileType = (file, cb) => {
    let fileTypes = /jpg|jpeg|gif|png/;
    let extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    
    if(extname){
        return cb(null, true);
    }else{
        cb ('error',"please choose images files only ")
    }
}

app.post('/upload/single', upload.single('singleimage'), (req, res, next) => {
    let file = req.file;

    // Handle missing file
    if (!file) {
        console.log("Please select a file");
        return res.redirect('/upload'); // Redirect user to upload page
    }

    let url = file.path.replace('public', ''); // Adjust file path for URL storage

    // Check if the image already exists in the database
    pictures.findOne({ imageUrl: url })
        .then((img) => {
            if (img) {
                console.log("Image already exists with this name");
                return res.redirect('/'); // Redirect to the main page if duplicate
            }

            // Create new image record in the database
            return pictures.create({ imageUrl: url })
                .then(() => {
                    console.log("Image saved to DB");
                    res.redirect('/'); // Redirect to main page after successful upload
                });
        })
        .catch((err) => {
            console.error("Error processing upload:", err);
            res.status(500).send("An error occurred while uploading the image.");
        });
});

app.post('/upload/multiple', upload.array('multiple'), (req, res, next) => {
    let files = req.files;

    // Handle missing file
    if (!files) {
        console.log("Please select a file");
        return res.redirect('/upload'); // Redirect user to upload page
    }
    files.forEach(file => {
        let url = file.path.replace('public', '');
        pictures.findOne({imageUrl :url})
        .then(async img =>{
            if(img){
                return console.log('Duplicate image')
            }
            await pictures.create({imageUrl : url})
        })
    });
    res.redirect('/')

})
app.delete('/delete/:id', (req, res) => {
    let searchQuery = { _id: req.params.id };

    pictures.findOne(searchQuery)
        .then((img) => {
            if (!img) {
                return res.status(404).send('Image not found');
            }

            fs.unlink(__dirname + '/public/' + img.imageUrl, (err) => {
                if (err) {
                    console.error('File deletion error:', err);
                    return res.status(500).send('Failed to delete the file');
                }

                pictures.deleteOne(searchQuery)
                    .then(() => res.redirect('/'))
                    .catch((err) => {
                        console.error('Database deletion error:', err);
                        res.status(500).send('Failed to delete the database record');
                    });
            });
        })
        .catch((err) => {
            console.error('Database query error:', err);
            res.status(500).send('Error finding the image');
        });
});

app.listen(3000,() =>{
    console.log("I am ready for your adventuries");
})

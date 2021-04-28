//////const { log } = require('console');

const express = require('express');
const FileSystem = require('fs');
const path = require("path");
const multer = require('multer');
const bodyParser = require('body-parser');
const {Server} = require('socket.io');
const http = require('http');
const {GraphQLString} = require('graphql');
const {GraphQLObjectType} = require('graphql');
const {GraphQLSchema} = require('graphql');
const {GraphQLList} = require('graphql');
const {GraphQLNonNull} = require('graphql');
const {graphqlHTTP} = require('express-graphql');
//const { resolve } = require('node:path');

const upload = multer({ dest: 'uploads/' });

const rootDirectoryPath = path.join(__dirname, '../drive');
const uploadFolderPath = path.join(__dirname, '../', '/uploads');

const app = express();
const httpServer = http.Server(app);

httpServer.listen(80);

app.use(express.static(path.join(__dirname, "../public")));

let globalSocket;


const fileNameType = new GraphQLObjectType({
    name: "tFileName", 
    fields: () => ({
        directoryList: {type: GraphQLList(GraphQLString)},
        fileList: {type: GraphQLList(GraphQLString)}
    }),
});


const RootQuery = new GraphQLObjectType({
    name: "RootQueryType",
    fields: {
        tFileName: {
            type: fileNameType,
            args:{
                name: {type: GraphQLString}
            },
            async resolve(parentValue, args){

                let name = args.name;

                if(name == "" || name == "..."){
                    if(name == ""){
                        currentDirectory = rootDirectoryPath;
                    }else{
                        currentDirectory = path.join(currentDirectory,"../");
                        currentDirectory = currentDirectory.substr(0, currentDirectory.length - 1);
                    }    
                    getDirectoryFilesList(currentDirectory); 
                    return {directoryList: directoryList, fileList: fileList};
                }else{
                    let fullPath = path.join(currentDirectory, "/", name);
                    if (FileSystem.existsSync(fullPath)) {
                        if(FileSystem.lstatSync(fullPath).isFile()){
        
                            let fileData = FileSystem.readFileSync(fullPath);

                            globalSocket.emit("res/user/download", {status:"success", result:{fileData: fileData, fileName: name}});

                            getDirectoryFilesList(currentDirectory); 
                            return {directoryList: directoryList, fileList: fileList};
                        }
                        else{
                            currentDirectory = fullPath;
                            getDirectoryFilesList(currentDirectory);  

                            return {directoryList: directoryList, fileList: fileList};
                        }
                    }            
                }                

            }
        }    
    }
});

const schema = new GraphQLSchema({ query: RootQuery});


app.use(
    "/graphql",
    graphqlHTTP({
      schema,
      graphiql: true,
    })
  );

const io = new Server(httpServer, {
    cors: {
      origin: process.env.ORIGIN,
      methods: ["GET", "POST"],
    },
  });

let posts;
let fileList = [];
let directoryList = [];
let DirectoryFilesList = [];

let currentDirectory = rootDirectoryPath;

io.on("connection", async (socket) => {

    globalSocket = socket; 
  
    socket.on("req/user/newFile", async({name}) => {
        if (FileSystem.existsSync(path.join(currentDirectory, "/", name)) == false) {
            FileSystem.mkdirSync(path.join(currentDirectory, "/", name));
        }   
        getDirectoryFilesList(currentDirectory);  
        socket.emit("res/user/newFile", {status: "success", result: {directoryList: directoryList, fileList: fileList} }); 
    }); 
    
    socket.on("req/user/loadFile", async({file, fileName}) => {

        FileSystem.writeFileSync(path.join(currentDirectory, "/", fileName), file);

        getDirectoryFilesList(currentDirectory);  
        socket.emit("res/user/newFile", {status: "success", result: {directoryList: directoryList, fileList: fileList} }); 
    }); 

});

function selectFileFunction(name){

}

function replaceFile(originfilename, fileName, destination) {
    FileSystem.renameSync(path.join(uploadFolderPath, "/", fileName),
        path.join(destination, "/", originfilename));
}

function createDirectory(currentDirectory, folderName) {

}

function getDirectoryFilesList(currentDirectory) {
    directoryList = [];
    fileList = [];

    DirectoryFilesList = FileSystem.readdirSync(currentDirectory);

    let currentFilePath;
    let length = rootDirectoryPath.length;

    if (currentDirectory != rootDirectoryPath){
        directoryList.push("...");
    }

    DirectoryFilesList.forEach(function(fileName) {
        currentFilePath = path.join(currentDirectory, "/", fileName);
        if (FileSystem.lstatSync(currentFilePath).isDirectory() == true) {

            directoryList.push(fileName);

        } else {
            fileList.push(fileName);
        }
    });
}

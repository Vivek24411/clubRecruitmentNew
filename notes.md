1. Executions is first parent code then child code without useEffect then after rendering useEffect of parent then child
2. first render happens then only navigate can be called so place navigate in useEffect if it can be executed in first rendering only
3. if setState is there and there are two then they are queued full code of that function runs then they are executed and then combine rendering happens then again useEffect runs from parent to child if there is any state update in useEffect then useEffect cycle completes from parent to child and then again rendering again happens from parent to child and any component which have that context variable
4. useEffect of unmounted component is not run
5. useEffect with empty dependency runs only once after first rendering


6. FILE UPLOADS
   for file uplaods you can not normally send file in json request body as json can not hold file binary data
   so we use FormData object which can hold file binary data and other text data as key value pair
   so create FormData object and append file and other data to it and send it
   we specify content-type as multipart/form-data so backend knows that it contaisn text and binary data both
   we use upload.sinlge middleware which bascually uses multer to handle file uploads, there multer parses the bianry then uploads to the configrued locarino it could be locally, or cloud like s3 or cloudinary etc and then adds the file info to req.file
   req.file contains info about uploaded file like path, size, mimetype etc
   then we can store the file path or url in database to access it later

7. Search functionality
    // Filter clubs based on search term
  const filteredClubs = clubs.filter(club => 
    club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    club.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (club.shortDescription && club.shortDescription.toLowerCase().includes(searchTerm.toLowerCase()))
  );
import * as functions from 'firebase-functions'; 
import * as admin from 'firebase-admin';
const algoliasearch = require('algoliasearch');
const nodemailer = require('nodemailer');
admin.initializeApp(functions.config().firestore);

const db = admin.firestore();
const algoliaClient = algoliasearch(functions.config().algolia.appid, functions.config().algolia.apikey);
const index = algoliaClient.initIndex("users");


const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;
const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});

const APP_NAME = 'UNISZN';

exports.reportUser = functions.firestore.document("reportedUsers/{uid}").onCreate(async (snapshot, context) => {

  const email = "support@uniszn.com"
  const uid = context.params.uid;
  return sendWelcomeEmail(email, uid);

});

async function sendWelcomeEmail(email: any, uid: any) {
  const mailOptions = {
    from: `${APP_NAME} <noreply@firebase.com>`,
    to: email,
    subject: `${uid} reported`,
    text: `${uid} has been reported - check this user`
  };

  // The user subscribed to the newsletter.
  await mailTransport.sendMail(mailOptions);
  console.log('Report Log sent to', email);
  return null;
}

exports.addToCourseIndex = functions.firestore.document("Universities/{uni}/{course}/{uid}").onCreate(async (snapshot, context) => {

  const uni = context.params.uni;
  const uid = context.params.uid;
  const course = context.params.course
  const Index = algoliaClient.initIndex(`${uni}${course}`);
  const docRef = db.collection('users').doc(uid);

  if (course == "Pending Addition") {
    console.log("Course is Pending Addition")
  }
  else {
  
  const p = docRef.get()
  return p.then(async doc => {
    if (!doc.exists) {
      console.log('No such document!');
    } 
      console.log(`Document found at path: ${doc.ref.path}`);
    
      const username = doc.get("username");
      const ProfilePicUrl = doc.get("ProfilePicUrl");
      const Uid = doc.get("uid");

      const data:JSON = <JSON><unknown>{
        "username": username,
        "ProfilePicUrl": ProfilePicUrl,
        "uid": Uid
      }

      const objectID = uid;
      console.log('Added user to index');

      return Index.saveObject({...data, objectID})
      });
    }
  });


exports.joinedCourse = functions.firestore.document("Universities/{uni}/{course}/{uid}").onCreate(async (snapshot, context) => {

  const uni = context.params.uni
  const course = context.params.course
  if (course == "Total") {
   console.log("Course is equal to Total")
  }
  else {
  const Uid = context.params.uid
  const ref = db.collection(`Universities/${uni}/${course}/`);
  const Snap = await ref.get();
  console.log(Snap)

  Snap.forEach(async (element:any) => {
  console.log(element.id);

  const user = await admin.auth().getUser(Uid)
  const docRef = db.collection('users').doc(element.id)

  docRef.get()
    .then(async doc => {
      if (!doc.exists) {
        console.log('No such document!');
      } 
        console.log(`Document found at path: ${doc.ref.path}`);
      
        const notificationtoken = doc.get("NotificationToken");

        const payload = {
          notification: {
            body: `${user.displayName} has joined your Course`,
            badge: '1'
          }
        };

    const response = await admin.messaging().sendToDevice(notificationtoken, payload);
    return Promise.all(response.results);
  })
    .catch(err => {
      console.log('Error getting document', err);
      });
    });
  }
});

/*exports.addToUniIndex = functions.firestore.document("Universities/{uni}/Total/{uid}").onCreate(async (snapshot, context) => {

  const uni = context.params.uni;
  const uid = context.params.uid;
  const Index = algoliaClient.initIndex(`${uni}`);
  const docRef = db.collection('users').doc(uid);

  const p = docRef.get()
  return p.then(async doc => {
    if (!doc.exists) {
      console.log('No such document!');
    } 
      console.log(`Document found at path: ${doc.ref.path}`);
    
      const username = doc.get("username");
      const ProfilePicUrl = doc.get("ProfilePicUrl");
      const Uid = doc.get("uid");

      const data:JSON = <JSON><unknown>{
        "username": username,
        "ProfilePicUrl": ProfilePicUrl,
        "uid": Uid
      }

      const objectID = uid;
      console.log('Added user to index');
      return Index.saveObject({...data, objectID});

    });
  }); */

 exports.joinedUni = functions.firestore.document("Universities/{uni}/Total/{uid}").onCreate(async (snapshot, context) => {

            const uni = context.params.uni
            const Uid = context.params.uid
            const ref = db.collection(`Universities/${uni}/Total/`);
            const Snap = await ref.get();
            Snap.forEach(async (element:any) => {
            console.log(element.id);
            const uid = element.id;

            const user = await admin.auth().getUser(Uid)
            const docRef = db.collection('users').doc(uid)

            docRef.get()
              .then(async doc => {
                if (!doc.exists) {
                  console.log('No such document!');
                } 
                  console.log(`Document found at path: ${doc.ref.path}`);
                
                  const notificationtoken = doc.get("NotificationToken");

                  const payload = {
                    notification: {
                      body: `${user.displayName} has joined your University`,
                      badge: '1'
                    }
                  };

              const response = await admin.messaging().sendToDevice(notificationtoken, payload);
              return Promise.all(response.results);
            })
              .catch(err => {
                console.log('Error getting document', err);
              });
      });
    
    });

 exports.newMessage = functions.firestore.document("user-messages/{uid}/{userID}/{message}").onCreate(async (snapshot, context) => {

        const data = snapshot.data()
        console.log(data)
        const fromid = data.FromID
        //const text = data.Text
        const toId = data.ToID
        const authUser = await admin.auth().getUser(fromid);
        const username = authUser.displayName; 

        if (fromid == context.params.uid) {
          console.log("This is the one that went to him")
        }

        else {

        const payload = {
          notification: {
            title: `Message from ${username}`,
            badge: '1'
          }
        };

        const docRef = db.collection('users').doc(toId)
            docRef.get()
              .then(async doc => {
                if (!doc.exists) {
                  console.log('No such document!');
                } 
                const notificationtoken = doc.get("NotificationToken");
                //console.log(notificationtoken)
                  

        const response = await admin.messaging().sendToDevice(notificationtoken, payload);
        return Promise.all(response.results);
      })
        .catch(err => {
          console.log('Error getting document', err);
        });
      }
    });

 exports.friendRequested = functions.firestore.document("Friends/{uid}/Requested/{userID}").onCreate(async (snapshot, context)=> {
 
        const requesteduid = context.params.uid;
        const followeruid = context.params.userID;

        const user = await admin.auth().getUser(followeruid)

        const payload = {
          notification: {
            body: `${user.displayName} has requested to be your friend` ,
            badge: '1'
          }
        };

        const ref = db.collection("users").doc(requesteduid)
        ref.get()
        .then(async doc => {
          if (!doc.exists) {
            console.log('No such document!');
          } 
            const notificationtoken = doc.get("NotificationToken");
            console.log(notificationtoken);

 
        const response = await admin.messaging().sendToDevice(notificationtoken, payload);
        return Promise.all(response.results);
      })
        .catch(err => {
          console.log('Error getting document', err);
        });

  });

  exports.acceptedFriend = functions.firestore.document("Friends/{uid}/Accepted/{userID}").onCreate(async (snapshot, context)=> {
 
    const requesteduid = context.params.uid;
    const followeruid = context.params.userID;

    const user = await admin.auth().getUser(requesteduid)

    const payload = {
      notification: {
        body: `You're now friends with ${user.displayName}`,
        badge: '1'
      }
    };

    const ref = db.collection("users").doc(followeruid)
    ref.get()
    .then(async doc => {
      if (!doc.exists) {
        console.log('No such document!');
      } 
        const notificationtoken = doc.get("NotificationToken");
        console.log(notificationtoken);


    const response = await admin.messaging().sendToDevice(notificationtoken, payload);
    return Promise.all(response.results);
  })
    .catch(err => {
      console.log('Error getting document', err);
    });

});


// Update the search index every time a blog post is written.
exports.addUserToIndex = functions.firestore.document('users/{uid}').onCreate((snap, context) => {

  const user = snap.data();
  const username = user["username"];
  const ProfilePicUrl = user["ProfilePicUrl"];
  const uid = user["uid"];
  const data:JSON = <JSON><unknown>{
    "username": username,
    "ProfilePicUrl": ProfilePicUrl,
    "uid": uid
  }
  const objectID = snap.id;
  console.log('Added user to index');
  return index.saveObject({...data, objectID});

});

exports.updateUserIndex = functions.firestore.document('users/{uid}').onUpdate((change) => {
  const newData = change.after.data();
  const username = newData["username"];
  const ProfilePicUrl = newData["ProfilePicUrl"];
  const uid = newData["uid"];
  const data:JSON = <JSON><unknown>{
    "username": username,
    "ProfilePicUrl": ProfilePicUrl,
    "uid": uid
  }
  const objectID = uid;
  console.log('Updated user to index');
  return index.saveObject({...data, objectID});
})

exports.updateUniCourseIndex = functions.firestore.document('users/{uid}').onUpdate((change) => {
  const newData = change.after.data();
  const username = newData["username"];
  const ProfilePicUrl = newData["ProfilePicUrl"];
  const uid = newData["uid"];
  const uni = newData["University"];
  const course = newData["Course"];
  if (uni == null || course == null) {
    console.log("uni and course == undefined");
  }
  else {

  const Index = algoliaClient.initIndex(`${uni}${course}`);
  const data:JSON = <JSON><unknown>{
    "username": username,
    "ProfilePicUrl": ProfilePicUrl,
    "uid": uid
  }
  const objectID = uid;
  console.log('Updated user to index');
  return Index.saveObject({...data, objectID});
  }   
})

exports.updateTotalUniIndex = functions.firestore.document('users/{uid}').onUpdate((change) => {
  const newData = change.after.data();
  const username = newData["username"];
  const ProfilePicUrl = newData["ProfilePicUrl"];
  const uid = newData["uid"];
  const uni = newData["University"];
  const Index = algoliaClient.initIndex(`${uni}Total`);
  if (uni == null) {
    console.log("uni == undefined");
  }
  else {

  const data:JSON = <JSON><unknown>{
    "username": username,
    "ProfilePicUrl": ProfilePicUrl,
    "uid": uid
  }
  const objectID = uid;
  console.log('Updated user to index');
  return Index.saveObject({...data, objectID});
  }
})

exports.deleteUserFromIndex = functions.firestore.document('users/{uid}')
.onDelete(snapshot => index.deleteObject(snapshot.id));

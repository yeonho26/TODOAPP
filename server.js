const express = require('express');
const app = express();

app.use(express.static(__dirname + '/public'))

app.set('view engine', 'ejs')

app.use(express.json())
app.use(express.urlencoded({extended:true}))
const methodOverride = require('method-override')
app.use(methodOverride('_method')) 

const { MongoClient, ObjectId } = require('mongodb')


const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')

app.use(passport.initialize())
app.use(session({
  secret: '암호화에 쓸 비번',
  resave : false,
  saveUninitialized : false,
  cookie : { maxAge : 60 * 60 * 1000 }
}))

app.use(passport.session())


let db
const url = 'mongodb+srv://admin:qwer1234@cluster0.sdqtg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
new MongoClient(url).connect().then((client)=>{
  console.log('DB연결성공')
  db = client.db('forum');
  app.listen(8080, function() {
    console.log('listening on 8080')
});
}).catch((err)=>{
  console.log(err)
})



/* 누군가 /pet 으로 방문을 하면 
pet과 관련된 안내문을 띄워줌 */
app.get('/pet', function(요청, 응답) {
    응답.send('펫용품 쇼핑할 수 있는 페이지입니다.');
});

/* 누군가 /beauty 으로 방문을 하면 
beauty와 관련된 안내문을 띄워줌 */

app.get('/beauty', function(요청, 응답) {
    응답.send('뷰티용품 쇼핑할 수 있는 페이지 입니다.');
});

// html 파일 보내기
app.get('/', function(요청, 응답) {
    응답.sendFile(__dirname + '/index.html')
});


app.get('/news', (요청, 응답) => {
    db.collection('post').insertOne({title : '어쩌구'})
    응답.send('오늘 비옴')
});

app.get('/list', async (요청, 응답) => {
    let result = await db.collection('post').find().toArray()
    

    응답.render('list.ejs', { 글목록: result } )
})

app.get('/time', (요청, 응답) => {
    응답.render('time.ejs', { data: new Date() })
})


app.get('/write', (요청, 응답) => {

    응답.render('write.ejs' )
})

app.post('/add', async (요청, 응답) => {
    console.log(요청.body)

    if (요청.body.title == '') {
        응답.send("제목 입력 안함")
    } else {
        await db.collection('post').insertOne({title : 요청.body.title, content : 요청.body.content})
    }

    try {
        if (요청.body.title == '') {
            응답.send("제목 입력 안함")
        } else {
            await db.collection('post').insertOne({title : 요청.body.title, content : 요청.body.content})
        }

    } catch(e) {
        console.log(e)
        응답.status(500).send('서버에러남')
    }

    await db.collection('post').insertOne({title : 요청.body.title, content : 요청.body.content})
    응답.redirect('/list')
})

app.get('/detail/:id', async (요청, 응답) => {
    try {
      let result = await db.collection('post').findOne({ _id : new ObjectId(요청.params.id) })
      if (result == null) {
        응답.status(400).send('그런 글 없음')
      } else {
        응답.render('detail.ejs', { result : result })
      }
      
    } catch (e){
      응답.status(404).send('이상한거 넣지마라')
    }
    
  })

app.get('/edit/:id', async (요청, 응답) => {
    let result = await db.collection('post').findOne({ _id : new ObjectId(요청.params.id) })
    console.log(result)
    응답.render('edit.ejs', {result : result})
})


app.put('/edit', async (요청, 응답) => {

    await db.collection('post').updateOne({ _id : new ObjectId(요청.body.id)}, {$set : { title : 요청.body.title , content : 요청.body.content }})
    console.log(요청.body)
    응답.redirect('/list')
})


app.put('/edit', async (요청, 응답) => {

    await db.collection('post').updateOne({ _id : 1 }, { $inc : { like : 2 } })
    // await db.collection('post').updateMany({ like : {$gt : 10} }, { $set : { like : 2 } }) like 항목이 10 이상인 document 수정
})

app.delete('/delete', async (요청, 응답) => {
    console.log(요청.query)
    await db.collection('post').deleteOne({ _id : new ObjectId(요청.query.docid)})
    응답.send('삭제완료')
})

/*
app.get('/list/1', async (요청, 응답) => {
    let result = await db.collection('post').find().limit(5).toArray()

    응답.render('list.ejs', { 글목록: result } )
})

app.get('/list/2', async (요청, 응답) => {
    let result = await db.collection('post').find().skip(5).limit(5).toArray()

    응답.render('list.ejs', { 글목록: result } )
})

app.get('/list/3', async (요청, 응답) => {
    let result = await db.collection('post').find().skip(10).limit(5).toArray()

    응답.render('list.ejs', { 글목록: result } )
})  */

app.get('/list/:id', async (요청, 응답) => {
    let result = await db.collection('post').find().skip((요청.params.id - 1)*5).limit(5).toArray()
    
    응답.render('list.ejs', { 글목록: result } )
})

app.get('/list/next/:id', async (요청, 응답) => {
    let result = await db.collection('post').find({_id : {$gt : new ObjectId(요청.params.id) }}).limit(5).toArray()
    
    응답.render('list.ejs', { 글목록: result } )
})


passport.use(new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    let result = await db.collection('user').findOne({ username : 입력한아이디})
    if (!result) {
      return cb(null, false, { message: '아이디 DB에 없음' })
    }
    if (result.password == 입력한비번) {
      return cb(null, result)
    } else {
      return cb(null, false, { message: '비번불일치' });
    }
  }))



passport.serializeUser((user, done) => {
    process.nextTick(() => {
      done(null, { id: user._id, username: user.username })
    })
})

passport.deserializeUser((user, done) => {
    process.nextTick(() => {
      return done(null, user)
    })
})

app.get('/login', async(요청,응답) =>{
    응답.render('login.ejs')
})

app.post('/login', async(요청,응답) =>{
    passport.authenticate('local', (error, user, info) => {
        if(error) return 응답.status(500).json(error)
        if(!user) return 응답.status(401).json(info.message)
        요청.logIn(user, (err)=> {
            if (err) return next(err)
            응답.redirect('/')   
        })
    })(요청, 응답, next)
})





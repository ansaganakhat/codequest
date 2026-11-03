import io, os, tempfile
from pathlib import Path
from cryptography.fernet import Fernet
BASE=Path(tempfile.mkdtemp(prefix='cq_test_'))
os.environ['DATABASE_URL']='sqlite:///'+str(BASE/'db.sqlite3')
os.environ['IIN_ENCRYPTION_KEY']=Fernet.generate_key().decode()
os.environ['PRIVATE_UPLOAD_DIR']=str(BASE/'photos')
from fastapi.testclient import TestClient
from PIL import Image
from app import app, DB, User, password_hash

def iin(prefix):
    digits=list(map(int,prefix))
    for weights in ((1,2,3,4,5,6,7,8,9,10,11),(3,4,5,6,7,8,9,10,11,1,2)):
        check=sum(a*b for a,b in zip(digits,weights))%11
        if check<10:return prefix+str(check)
    raise RuntimeError('bad test prefix')
def register(client,role,email,number,school=1):
    return client.post('/api/auth/register',json={'role':role,'full_name':'Demo Test Person','iin':iin(number),'phone':'+77011234567','email':email,'password':'SecurePassword123!','school_id':school if role=='teacher' else None,'subject_ids':[1] if role=='teacher' else [],'consent':True})
def admin(db):
    a=User(full_name='System Administrator',email='admin@example.test',password_hash=password_hash('AdminPassword123!'),role='admin',status='approved')
    db.add(a);db.commit()

def test_registration_approval_scoping_and_photos():
    with TestClient(app) as parent:
        schools=parent.get('/api/schools').json()
        assert len(schools)==3
        assert parent.get('/api/children').status_code==401
        r=register(parent,'parent','parent@example.test','99123140011')
        assert r.status_code==201,r.text
        assert r.json()['role']=='parent' and 'iin' not in r.json()
        assert register(parent,'parent','p2@example.test','99123140011').status_code==409
        child=parent.post('/api/children',json={'full_name':'Demo School Child','iin':iin('14010150001'),'grade':6,'class_letter':'Ә','school_id':1})
        assert child.status_code==201,child.text
        cid=child.json()['id']
        assert child.json()['status']=='pending'
        assert parent.get('/api/students').status_code==403
        img=Image.new('RGB',(80,80),(90,120,160));buf=io.BytesIO();img.save(buf,'JPEG')
        uploaded=parent.post('/api/students/'+str(cid)+'/photo',files={'file':('test.jpg',buf.getvalue(),'image/jpeg')})
        assert uploaded.status_code==200,uploaded.text
        assert parent.get('/api/students/'+str(cid)+'/photo').status_code==200
        with TestClient(app) as teacher:
            r=register(teacher,'teacher','teacher@example.test','99010130001')
            assert r.status_code==201,r.text
            assert r.json()['status']=='pending'
            assert teacher.get('/api/students').status_code==403
            assert teacher.get('/api/students/'+str(cid)+'/photo').status_code==404
            with DB() as db:admin(db)
            with TestClient(app) as administrator:
                assert administrator.post('/api/auth/login',json={'email':'admin@example.test','password':'AdminPassword123!'}).status_code==200
                accounts=administrator.get('/api/admin/users').json()
                assert all('iin' not in u for u in accounts)
                teacher_id=[u['id'] for u in accounts if u['role']=='teacher'][0]
                assert administrator.patch('/api/admin/users/'+str(teacher_id),json={'status':'approved'}).status_code==200
                assert administrator.patch('/api/admin/students/'+str(cid),json={'status':'approved'}).status_code==200
                assert 'iin' not in administrator.get('/api/students').json()[0]
                assert len(teacher.get('/api/students').json())==1
                assert teacher.get('/api/students/'+str(cid)+'/photo').status_code==200
                assert parent.patch('/api/children/'+str(cid),json={'grade':7}).status_code==200
                assert teacher.get('/api/students').json()==[]
                assert administrator.patch('/api/admin/students/'+str(cid),json={'status':'approved'}).status_code==200
                assert teacher.get('/api/students').json()[0]['grade']==7
                assert administrator.post('/api/admin/schools',json={'name':'Demo School X','city':'Astana'}).status_code==201
                assert administrator.patch('/api/admin/users/'+str(teacher_id),json={'phone':'+77013334455'}).status_code==200
                newsub=administrator.post('/api/admin/subjects',json={'name_kk':'Робототехника','name_ru':'Робототехника','name_en':'Robotics'})
                assert newsub.status_code==201,newsub.text
                assert administrator.patch('/api/admin/subjects/'+str(newsub.json()['id']),json={'name_kk':'Робототехника','name_ru':'Робототехника','name_en':'Robotics Lab'}).status_code==200
                assert administrator.delete('/api/admin/subjects/'+str(newsub.json()['id'])).status_code==200
                assert teacher.get('/api/admin/users').status_code==403
                with TestClient(app) as other_school:
                    other=register(other_school,'teacher','other_teacher@example.test','99010130021',school=2)
                    assert other.status_code==201,other.text
                    other_id=other.json()['id']
                    assert administrator.patch('/api/admin/users/'+str(other_id),json={'status':'approved'}).status_code==200
                    assert other_school.get('/api/students').json()==[]
                    assert other_school.get('/api/students/'+str(cid)+'/photo').status_code==404

def test_validation_roles_and_origins():
    with TestClient(app) as client:
        p={'role':'admin','full_name':'Bad Role User','iin':iin('99010130011'),'phone':'+77011234567','email':'x@example.test','password':'SecurePassword123!','consent':True}
        assert client.post('/api/auth/register',json=p).status_code==422
        p['role']='teacher';p['subject_ids']=[];p['school_id']=1
        assert client.post('/api/auth/register',json=p).status_code==422
        p['role']='parent'
        assert client.post('/api/auth/register',json=p,headers={'Origin':'https://attacker.invalid'}).status_code==403
        p['iin']='123'
        assert client.post('/api/auth/register',json=p).status_code==422

def test_consent_required():
    with TestClient(app) as client:
        p={'role':'parent','full_name':'Test No Consent','iin':iin('99123140021'),'phone':'+77011234567','email':'no-consent@example.test','password':'SecurePassword123!'}
        assert client.post('/api/auth/register',json=p).status_code==422

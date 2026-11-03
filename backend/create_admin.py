"""Create a real administrator from the CLI. Never allow admin signup over HTTP."""
from getpass import getpass
from sqlalchemy import select
from app import DB, Base, engine, User, password_hash, School, Subject
from app import utc

def main():
    Base.metadata.create_all(engine)
    full_name=input('Admin full name: ').strip()
    email=input('Admin email: ').strip().lower()
    password=getpass('Admin password (10+ chars): ')
    if len(full_name)<3 or '@' not in email or len(password)<10:
        raise SystemExit('Invalid name, email, or password')
    with DB() as db:
        if db.scalar(select(User.id).where(User.email==email)):
            raise SystemExit('Email already exists')
        user=User(full_name=full_name,email=email,password_hash=password_hash(password),role='admin',status='approved')
        db.add(user)
        db.commit()
    print('Administrator created. Log in through the regular sign-in form.')

if __name__=='__main__':main()

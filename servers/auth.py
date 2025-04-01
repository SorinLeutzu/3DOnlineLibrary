from functools import wraps
from flask import Flask, request, jsonify, g
import jwt
import psycopg2
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
import uuid
from datetime import datetime, timedelta


app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key_here'
app.config[
    'SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:pass@localhost/lib3d'


db = SQLAlchemy(app)

conn = psycopg2.connect(
    host="localhost",
    database="lib3d",
    user="postgres",
    password="pass"
)


class Blacklist(db.Model):
    __tablename__ = 'blacklist'
    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(255), unique=True, nullable=False)
    blacklisted_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, jti):
        self.jti = jti



@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    is_creator = data.get('is_creator', False)

    if not username or not password or not email:
        return jsonify({'message': 'Username, password, and email are required'}), 400

    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
            if cursor.fetchone():
                return jsonify({'message': 'User already exists'}), 409

            hashed_password = generate_password_hash(password)
            cursor.execute(
                "INSERT INTO users (username, password, email, is_creator) VALUES (%s, %s, %s, %s) RETURNING user_id",
                (username, hashed_password, email, is_creator)
            )
            conn.commit()
            return jsonify({'message': 'User registered successfully'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'message': 'Registration failed', 'error': str(e)}), 500



@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Username and password are required'}), 400

    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT password FROM users WHERE username = %s", (username,))
            user = cursor.fetchone()
            if not user or not check_password_hash(user[0], password):
                return jsonify({'message': 'Invalid credentials'}), 401

            token = create_token(username)
            return jsonify({'token': token}), 200
    except Exception as e:
        return jsonify({'message': 'Login failed', 'error': str(e)}), 500



def create_token(username):
    jti = str(uuid.uuid4())
    payload = {
        'username': username,
        'exp': datetime.utcnow() + timedelta(minutes=30),
        'jti': jti
    }
    token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')
    return token



def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing'}), 403
        token = token.replace("Bearer ", "")

        try:
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            jti = payload.get("jti")
            if Blacklist.query.filter_by(jti=jti).first():
                return jsonify({'message': 'Token has been logged out'}), 403
            g.user = payload['username']
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 403
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 403

        return f(*args, **kwargs)

    return decorated



@app.route('/protected', methods=['GET'])
@token_required
def protected():
    return jsonify({'message': f'Welcome, {g.user}! This is a protected route.'}), 200



@app.route('/logout', methods=['POST'])
@token_required
def logout():
    token = request.headers.get('Authorization').replace("Bearer ", "")
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        jti = payload.get("jti")

        blacklisted_token = Blacklist(jti=jti)
        db.session.add(blacklisted_token)
        db.session.commit()
        return jsonify({'message': 'Successfully logged out'}), 200
    except jwt.ExpiredSignatureError:
        return jsonify({'message': 'Token has already expired'}), 403
    except jwt.InvalidTokenError:
        return jsonify({'message': 'Invalid token'}), 403


@app.route('/user/by-token', methods=['GET'])
@token_required
def get_user_by_token():
    username = g.user  
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT user_id FROM users WHERE username = %s", (username,))
            user = cursor.fetchone()
            if user:
                return jsonify({'user_id': user[0]}), 200
            else:
                return jsonify({'message': 'User not found'}), 404
    except Exception as e:
        return jsonify({'message': 'Error retrieving user', 'error': str(e)}), 500



if __name__ == '__main__':
    app.run(debug=True)

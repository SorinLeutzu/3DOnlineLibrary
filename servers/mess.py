import psycopg2
import json
from flask import Flask, request, jsonify, abort
import logging
from datetime import datetime

app = Flask(__name__)


logging.basicConfig(level=logging.DEBUG)


def get_db_connection():
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        dbname="lib3d",
        user="postgres",
        password="pass"
    )
    return conn


class Message:
    def __init__(self, message_id, sender_id, receiver_id, content, timestamp):
        self.message_id = message_id
        self.sender_id = sender_id
        self.receiver_id = receiver_id
        self.content = content
        self.timestamp = timestamp

    def to_dict(self):
        return {
            "message_id": self.message_id,
            "sender_id": self.sender_id,
            "receiver_id": self.receiver_id,
            "content": self.content,
            "time": self.timestamp
        }


class Conversation:
    def __init__(self, receiver_id):
        self.receiver_id = receiver_id

    def to_dict(self):
        return {"receiver_id": self.receiver_id}


@app.route('/send_message', methods=['POST'])
def send_message():
    if request.method != 'POST':
        abort(405)  

    try:
        msg = request.get_json()
        sender_id = msg['sender_id']
        receiver_id = msg['receiver_id']
        content = msg['content']
        timestamp = datetime.now()

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO messages (sender_id, receiver_id, content, time) VALUES (%s, %s, %s, %s) RETURNING message_id",
            (sender_id, receiver_id, content, timestamp)
        )
        message_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        response_message = Message(message_id, sender_id, receiver_id, content, timestamp)
        return jsonify(response_message.to_dict()), 201
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({"error": "Invalid request payload"}), 400

@app.route('/get_messages', methods=['GET'])
def get_messages():
    if request.method != 'GET':
        abort(405)

    sender_id = request.args.get('sender_id')
    receiver_id = request.args.get('receiver_id')

    if not sender_id or not receiver_id:
        abort(400) 

    try:
        sender_id = int(sender_id)
        receiver_id = int(receiver_id)

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT message_id, sender_id, receiver_id, content, time FROM messages "
            "WHERE (sender_id = %s AND receiver_id = %s) OR (sender_id = %s AND receiver_id = %s) "
            "ORDER BY time",
            (sender_id, receiver_id, receiver_id, sender_id)
        )
        rows = cur.fetchall()
        conn.close()

        messages = []
        for row in rows:
            message = Message(row[0], row[1], row[2], row[3], row[4])
            messages.append(message.to_dict())

        return jsonify(messages), 200
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({"error": "Error fetching messages"}), 500


@app.route('/get_user_conversations', methods=['GET'])
def get_user_conversations():
    if request.method != 'GET':
        abort(405) 

    user_id = request.args.get('user_id')
    if not user_id:
        abort(400) 

    try:
        user_id = int(user_id)

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT DISTINCT CASE "
            "WHEN sender_id = %s THEN receiver_id "
            "ELSE sender_id END AS user_id "
            "FROM messages "
            "WHERE sender_id = %s OR receiver_id = %s",
            (user_id, user_id, user_id)
        )
        rows = cur.fetchall()
        conn.close()

        conversations = [Conversation(row[0]) for row in rows]
        return jsonify([conv.to_dict() for conv in conversations]), 200
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({"error": "Error fetching conversations"}), 500

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=8081)

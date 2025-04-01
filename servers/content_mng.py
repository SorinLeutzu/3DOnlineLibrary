

from flask import Flask, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from io import BytesIO
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, Sequence, Enum, Boolean, TIMESTAMP, LargeBinary,Table
import enum
from flask_security import Security, SQLAlchemyUserDatastore, UserMixin, RoleMixin, login_required
from sqlalchemy import create_engine
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import sessionmaker, relationship, backref

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:...@localhost/lib3d'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['MAX_CONTENT_LENGTH'] = 160 * 1024 * 1024  # 16 MB

from flask_cors import CORS

engine = create_engine('postgresql://postgres:...@localhost/lib3d')

CORS(app)

db = SQLAlchemy(app)


Base = automap_base()

Base.prepare(autoload_with=engine)



class PieceOfArt(enum.Enum):
    book = 'book'
    object = 'object'
    picture = 'picture'


Art = Base.classes.art
LearningSpaces = Base.classes.learning_spaces
User = Base.classes.users
LearningSpacesBooks = Base.classes.learning_spaces_books

Session = sessionmaker(bind=engine)
session = Session()


@app.route('/upload', methods=['POST'])
def upload_art():
    try:
      
        print("Request form:", request.form)
        print("Request files:", request.files)

      
        file_data = request.files['file_data'].read() if 'file_data' in request.files else None
        displayed_image = request.files['displayed_image'].read() if 'displayed_image' in request.files else None

        if not file_data:
            return jsonify({"error": "File data is required"}), 400

     
        name = request.form['name']
        author = request.form['author']
        description = request.form.get('description', '')
        publishing_date = request.form.get('publishing_date', '')
        content_type = request.form['content_type']

      
        allowed_types = ['book', 'object', 'picture']
        if content_type not in allowed_types:
            return jsonify({"error": f"Invalid content_type. Allowed values are: {allowed_types}"}), 400

        new_art = Art(
            name=name,
            author=author,
            description=description,
            publishing_date=publishing_date,
            file_data=file_data,
            displayed_image=displayed_image,
            content_type=content_type
        )
        db.session.add(new_art)
        db.session.commit()
        return jsonify({"message": "Art uploaded successfully!", "art_id": new_art.art_id}), 201
    except Exception as e:
        print("Error processing upload:", str(e))
        return jsonify({"error": str(e)}), 500



@app.route('/art/<int:art_id>', methods=['GET'])
def get_art(art_id):
    try:
        art = Art.query.get(art_id)
        if not art:
            return jsonify({"error": "Art not found"}), 404

        response = {
            "art_id": art.art_id,
            "name": art.name,
            "author": art.author,
            "description": art.description,
            "publishing_date": art.publishing_date,
            "downloads": art.downloads,
            "content_type": art.content_type
        }
        return jsonify(response), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/art/<int:art_id>/download', methods=['GET'])
def download_art_file(art_id):
    try:
        art = Art.query.get(art_id)
        if not art or not art.file_data:
            return jsonify({"error": "File not found"}), 404

        art.downloads += 1
        db.session.commit()

        return send_file(
            BytesIO(art.file_data),
            download_name=f"{art.name}.bin",
            as_attachment=True
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/art/<int:art_id>', methods=['DELETE'])
def delete_art(art_id):
    try:
        art = Art.query.get(art_id)
        if not art:
            return jsonify({"error": "Art not found"}), 404

        db.session.delete(art)
        db.session.commit()
        return jsonify({"message": "Art deleted successfully!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


from flask import request, jsonify
from sqlalchemy.exc import SQLAlchemyError

import base64

@app.route('/art/search', methods=['GET'])
def search_art():
    try:
        query = request.args.get('query', '').strip()
        if not query:
            return jsonify({"error": "Query parameter is required"}), 400

        results = session.query(Art).filter(Art.description.ilike(f"%{query}%")).all()

        response = []
        for art in results:
            displayed_image_base64 = None
            file_data_base64 = None

            if art.displayed_image:
                displayed_image_base64 = base64.b64encode(art.displayed_image).decode('utf-8')

            if art.file_data:
                file_data_base64 = base64.b64encode(art.file_data).decode('utf-8')

            response.append({
                "art_id": art.art_id,
                "name": art.name,
                "author": art.author,
                "description": art.description,
                "publishing_date": art.publishing_date,
                "content_type": art.content_type,
                "displayed_image": displayed_image_base64,
                "file_data": file_data_base64
            })

        return jsonify(response), 200

    except SQLAlchemyError as e:
        print("Database error:", str(e))
        return jsonify({"error": "Database error, please try again later"}), 500
    except Exception as e:
        print("Unexpected error:", str(e))
        return jsonify({"error": "An unexpected error occurred"}), 500



import base64



@app.route('/user/<int:user_id>/art', methods=['GET'])
def get_art_by_user(user_id):
    try:
        user = session.query(User).filter_by(user_id=user_id).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        learning_space_id = user.learning_space_id
        if not learning_space_id:
            return jsonify({"error": "User is not associated with any learning space"}), 404

        art_pieces = (
            session.query(Art)
            .join(LearningSpacesBooks, LearningSpacesBooks.book_id == Art.art_id)
            .filter(LearningSpacesBooks.learning_space_id == learning_space_id)
            .all()
        )

        if not art_pieces:
            return jsonify([]), 200

        response = [
            {
                "art_id": art.art_id,
                "name": art.name,
                "author": art.author,
                "description": art.description,
                "publishing_date": art.publishing_date,
                "downloads": art.downloads,
                "content_type": art.content_type,
                "displayed_image": base64.b64encode(art.displayed_image).decode("utf-8") if art.displayed_image else None,
                "file_data": base64.b64encode(art.file_data).decode("utf-8") if art.file_data else None,
            }
            for art in art_pieces
        ]

        return jsonify(response), 200

    except Exception as e:
        print("Error in get_art_by_user:", str(e))
        return jsonify({"error": "An unexpected error occurred"}), 500

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=8082)

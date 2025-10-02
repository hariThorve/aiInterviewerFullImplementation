from unittest import loader
from langchain_community.document_loaders import PyPDFLoader
import os
from dotenv import load_dotenv
from langchain_community.document_loaders import (
    Docx2txtLoader,
    UnstructuredWordDocumentLoader,
)
from groq import Groq

load_dotenv()

api = os.getenv("GROQ_API_KEY")
client = Groq(api_key=api)


file = "resumeHariprasadNew.docx"


def pdfParser(file):
    loader = PyPDFLoader(file)
    documents = loader.load()
    return documents


def docxParser(file):
    loader = Docx2txtLoader(file)
    documents = loader.load()
    return documents


document = docxParser(file)
completion = client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[
        {
            "role": "system",
            "content": """ You are a helpfull assistant that will find the details from the resume and store it in the structuerd format like json only. If the details are not present in the resume, you will return null for that field. The fields to be extracted are name, email, phone, skills, experience, education, projects. The format of the json is {name: '', email: '', phone: '', skills: [], experience: [], education: [], projects: []}. The experience field is an array of objects with each object having the fields title, company, start_date, end_date, description. The education field is an array of objects with each object having the fields degree, institution, start_date, end_date, description. The projects field is an array of objects with each object having the fields name, description, technologies.The skills field is an array of strings. Output only the json and nothing else.""",
        },
        {
            "role": "user",
            "content": f"Extract the details from the resume: {document[0].page_content}",
        },
    ],
    temperature=1,
    max_completion_tokens=1024,
    top_p=1,
)

print(completion.choices[0].message.content)

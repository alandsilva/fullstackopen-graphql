require('dotenv').config();
const { ApolloServer, gql } = require('apollo-server');
const mongoose = require('mongoose');

const Author = require('./models/author');
const Book = require('./models/book');

console.log('connecting to', process.env.MONGODB_URI);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('connected to MongoDB');
  })
  .catch((error) => {
    console.log('error connecting to MongoDB:', error.message);
  });

const typeDefs = gql`
  type Book {
    title: String!
    published: Int!
    author: Author!
    id: ID!
    genres: [String!]!
  }

  type Author {
    name: String!
    id: ID!
    born: Int
    bookCount: Int!
  }

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
  }

  type Mutation {
    addBook(
      title: String!
      published: Int!
      author: String!
      genres: [String!]!
    ): Book
    editAuthor(name: String!, setBornTo: Int!): Author
  }
`;

const resolvers = {
  Query: {
    bookCount: () => Book.collection.countDocuments(),
    authorCount: () => Author.collection.countDocuments(),
    allBooks: async (root, args) => {
      let result = await Book.find({}).populate('author');
      // if (args.author) {
      //   result = result.filter((b) => b.author === args.author);
      // }
      if (args.genre) {
        result = result.filter((b) => b.genres.includes(args.genre));
      }
      return result;
    },
    allAuthors: async (root, args) => {
      const authors = await Author.find({});
      return authors;
    },
  },

  Mutation: {
    addBook: async (root, args) => {
      const author = await Author.findOne({ name: args.author });
      if (!author) {
        const authorToSave = new Author({ name: args.author });
        const newAuthor = await authorToSave.save();

        const book = new Book({ ...args, author: newAuthor.id });
        const newBook = await book.save();
        return newBook;
      }

      const book = new Book({ ...args, author: author.id });
      const newBook = await book.save();
      return newBook;
    },
    editAuthor: async (root, args) => {
      const updatedAuthor = await Author.findOneAndUpdate(
        { name: args.name },
        { born: args.setBornTo },
        { new: true }
      );
      return updatedAuthor;
    },
  },

  Author: {
    bookCount: async (root) => {
      const books = await Book.find({ author: root.id });
      return books.length;
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});

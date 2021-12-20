require('dotenv').config();
const {
  ApolloServer,
  gql,
  UserInputError,
  AuthenticationError,
} = require('apollo-server');
const mongoose = require('mongoose');

const Author = require('./models/author');
const Book = require('./models/book');
const User = require('./models/user');

const jwt = require('jsonwebtoken');
const JWT_SECRET = 'NEED_HERE_A_SECRET_KEY';

const { PubSub } = require('graphql-subscriptions');
const pubsub = new PubSub();

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

  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }

  type Token {
    value: String!
  }

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
    me: User
  }

  type Mutation {
    addBook(
      title: String!
      published: Int!
      author: String!
      genres: [String!]!
    ): Book
    editAuthor(name: String!, setBornTo: Int!): Author
    createUser(username: String!, favoriteGenre: String!): User
    login(username: String!, password: String!): Token
  }

  type Subscription {
    bookAdded: Book!
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
    me: (root, args, context) => {
      return context.currentUser;
    },
  },

  Mutation: {
    addBook: async (root, args, context) => {
      const currentUser = context.currentUser;
      if (!currentUser) {
        throw new AuthenticationError('not authenticated');
      }
      const author = await Author.findOne({ name: args.author });
      if (!author) {
        try {
          const authorToSave = new Author({ name: args.author });
          const newAuthor = await authorToSave.save();
          const book = new Book({ ...args, author: newAuthor.id });
          const newBook = await book.save();
          book.author = authorToSave;
          pubsub.publish('BOOK_ADDED', {
            bookAdded: book,
          });
          return newBook;
        } catch (error) {
          throw new UserInputError(error.message, {
            invalidArgs: args,
          });
        }
      }

      try {
        const book = new Book({ ...args, author: author.id });
        const newBook = await book.save();

        book.author = author;
        pubsub.publish('BOOK_ADDED', { bookAdded: book });
        return newBook;
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        });
      }
    },
    editAuthor: async (root, args, context) => {
      const currentUser = context.currentUser;
      if (!currentUser) {
        throw new AuthenticationError('not authenticated');
      }
      try {
        const updatedAuthor = await Author.findOneAndUpdate(
          { name: args.name },
          { born: args.setBornTo },
          { new: true }
        );
        return updatedAuthor;
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        });
      }
    },
    createUser: async (root, args) => {
      try {
        const userToBeSaved = new User({ ...args });
        const newUser = await userToBeSaved.save();
        return newUser;
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        });
      }
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username });

      if (!user || args.password !== 'secret') {
        throw new UserInputError('wrong credentials');
      }

      const userForToken = {
        username: user.username,
        id: user._id,
      };

      return { value: jwt.sign(userForToken, JWT_SECRET) };
    },
  },

  Author: {
    bookCount: async (root) => {
      const books = await Book.find({ author: root.id });
      return books.length;
    },
  },

  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterator(['BOOK_ADDED']),
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null;
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const decodedToken = jwt.verify(auth.substring(7), JWT_SECRET);
      const currentUser = await User.findById(decodedToken.id);
      return { currentUser };
    }
  },
});

server.listen().then(({ url, subscriptionsUrl }) => {
  console.log(`Server ready at ${url}`);
  console.log(`Subscriptions ready at ${subscriptionsUrl}`);
});

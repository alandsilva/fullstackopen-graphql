import React from 'react';
import { useQuery } from '@apollo/client';
import { ALL_BOOKS, ME } from '../queries';

const Recommended = (props) => {
  const result = useQuery(ALL_BOOKS);
  const userResult = useQuery(ME);

  if (!props.show) {
    return null;
  }

  if (result.loading) {
    return <div>Loading...</div>;
  }

  const books = result.data.allBooks.filter((book) =>
    book.genres.includes(userResult.data.me.favoriteGenre)
  );

  return (
    <div>
      <h2>books</h2>

      <table>
        <tbody>
          <tr>
            <th></th>
            <th>author</th>
            <th>published</th>
          </tr>
          {books.map((a) => (
            <tr key={a.title}>
              <td>{a.title}</td>
              <td>{a.author.name}</td>
              <td>{a.published}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Recommended;

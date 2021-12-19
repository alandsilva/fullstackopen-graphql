import React, { useEffect, useState } from 'react';
import { useQuery, useLazyQuery } from '@apollo/client';
import { ALL_BOOKS, ME } from '../queries';

const Recommended = (props) => {
  const userResult = useQuery(ME);
  const [getBooks, result] = useLazyQuery(ALL_BOOKS);
  const [books, setBooks] = useState([]);

  const showBooks = (genre) => {
    getBooks({ variables: { genre: genre } });
  };

  useEffect(() => {
    if (userResult.data && userResult.data.me) {
      console.log(userResult.data);
      showBooks(userResult.data.me.favoriteGenre);
    }

    // eslint-disable-next-line
  }, [userResult.data]);

  useEffect(() => {
    if (result.data) {
      setBooks(result.data.allBooks);
    }
  }, [result]);

  if (!props.show) {
    return null;
  }

  if (result.loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>recommendations</h2>

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
